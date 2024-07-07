import { NextFunction, Request, Response } from "express";
import arweave, { ardb } from "../config/arweave.config";
import appConfig from "../config/app.config";
import wallet from "../config/wallet.config";
import asyncHandler from "express-async-handler";
import {
  CommentValidation,
  rantValidationSchema,
} from "../validation/rant.validation";

const rantController = {
  fetchAllRants: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string, 10);
        const limit = parseInt(req.query.limit as string, 10);

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        if (!process.env.WALLET_ID) {
          throw new Error(
            "WALLET_ID is not defined in the environment variables"
          );
        }

        const { name, version } = appConfig;

        const transactions = await ardb
          .search("transactions")
          .tag("App-Name", name)
          .tag("App-Version", version)
          .tag("Tag", "rant")
          .from(process.env.WALLET_ID)
          .findAll();

        const rants = await Promise.all(
          transactions.map(async (transaction) => {
            const rantData = await arweave.transactions.getData(
              transaction.id,
              { decode: true, string: true }
            );

            const parsedPayload = JSON.parse(rantData as any);

            return { id: transaction.id, ...parsedPayload };
          })
        );

        const paginatedRants = rants.slice(startIndex, endIndex);
        const totalPages = Math.ceil(rants.length / limit);

        const responsePayload = {
          rants: paginatedRants,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        };

        res.status(200).json({
          payload: responsePayload,
          message: "Rants fetched successfully",
        });
      } catch (error) {
        next(error);
      }
    }
  ),
  fetchRantById: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!process.env.WALLET_ID) return;
      const { id } = req.params;

      const { name, version } = appConfig;

      // Check if the transaction exist
      let result = await ardb
        .search("transactions")
        .tag("App-Name", name)
        .tag("App-Version", version)
        .id(id)
        .from(process.env.WALLET_ID)
        .findOne();

      if (!result) {
        res.status(400).json({
          id: null,
          rant: null,
          message: "Rant doesnt exist, Please try again later",
        });
      }

      // get all related comment

      let commentResult = await ardb
        .search("transactions")
        .tag("App-Name", name)
        .tag("App-Version", version)
        .tag("Type", "comment")
        .tag("TID", id)
        .from(process.env.WALLET_ID)
        .findAll();

      const commentPayload = await Promise.all(
        commentResult.map(async (comment, index) => {
          const rantData = await arweave.transactions.getData(comment.id, {
            decode: true,
            string: true,
          });

          const parsedPayload = JSON.parse(rantData as any);

          return { id: index, ...parsedPayload };
        })
      );

      console.log();

      const details = await arweave.transactions.getData(id, {
        decode: true,
        string: true,
      });

      const parsedPayload = JSON.parse(details as any);

      res.status(200).json({
        ...parsedPayload,
        id: id,
        comment: commentPayload,
        message: "Rant Fetched successfully",
      });
    }
  ),

  createRant: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { body } = req;

        // expect a toc field
        if (!body.toc && body.toc !== "true") {
          throw new Error(
            "Invalid Action, you did not accept the Terms and condition"
          );
        }

        // validation
        const isValidated = rantValidationSchema.safeParse(body);
        if (!isValidated.success) {
          throw new Error(
            `${isValidated.error.issues[0].message}` || "Something went wrong"
          );
        }

        // check blaance
        const balance = await arweave.wallets.getBalance(
          process.env.WALLET_ID || ""
        );
        const ammout = Number(balance) / 1000000000000;

        if (ammout <= 0 || ammout === 0 || ammout >= 1) {
          throw new Error(
            "Action Invalid, No Available Token anymore, Send Help!!"
          );
        }

        const preparedPayload = {
          ...body,
          createdAt: new Date().toISOString(),
        };

        const preparedTransaction = await arweave.createTransaction(
          { data: JSON.stringify(preparedPayload) },
          wallet
        );

        const { name, version } = appConfig;

        // Setting tags
        preparedTransaction.addTag("Content-Type", "text/plain");
        preparedTransaction.addTag("App-Name", name);
        preparedTransaction.addTag("App-Version", version);
        preparedTransaction.addTag("Tag", "rant");

        //Signing token
        await arweave.transactions.sign(preparedTransaction, wallet);

        // Posting the data
        const result = await arweave.transactions.post(preparedTransaction);

        // check transaction status
        const status = await arweave.transactions.getStatus(
          preparedTransaction.id
        );

        if (status.confirmed === null) {
          res.status(200).json({
            id: preparedTransaction.id,
            ...result,
            message:
              "Your Rant is being processed. Please wait a moment while we load it. Thank you for your patience.",
          });
        }

        res.status(200).json({
          id: preparedTransaction.id,
          ...result,
          message: "Created successfully without a hitch",
        });
      } catch (e) {
        throw new Error(e as any);
      }
    }
  ),

  commentRant: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body } = req;

    if (!process.env.WALLET_ID) return;

    // validation
    const isValidated = CommentValidation.safeParse(body);
    if (!isValidated.success) {
      throw new Error(
        `${isValidated.error.issues[0].message}` || "Something went wrong"
      );
    }

    const { name, version } = appConfig;
    let result = await ardb
      .search("transactions")
      .tag("App-Name", name)
      .tag("App-Version", version)
      .id(id)
      .from(process.env.WALLET_ID)
      .findOne();

    if (!result) {
      res.status(400).json({
        id: null,
        rant: null,
        message: "Rant doesnt exist, Please try again later",
      });
    }

    // create comment
    const preparedPayload = {
      transactionID: id,
      comment: body.comment,
      createdAt: new Date().toISOString(),
    };

    const preparedTransaction = await arweave.createTransaction(
      { data: JSON.stringify(preparedPayload) },
      wallet
    );

    // Setting tags
    preparedTransaction.addTag("Content-Type", "text/plain");
    preparedTransaction.addTag("App-Name", name);
    preparedTransaction.addTag("App-Version", version);
    preparedTransaction.addTag("Type", "comment");
    preparedTransaction.addTag("TID", id);

    //Signing token
    await arweave.transactions.sign(preparedTransaction, wallet);

    // Posting the data
    const createdTransaction = await arweave.transactions.post(
      preparedTransaction
    );

    if (!createdTransaction) {
      res.status(400).json({
        id: null,
        rant: null,
        message: "Creating comment failed",
      });
    }

    // check transaction status
    const status = await arweave.transactions.getStatus(preparedTransaction.id);

    if (status.confirmed === null) {
      res.status(200).json({
        id: preparedTransaction.id,
        message:
          "Your Rant is being processed. Please wait a moment while we load it. Thank you for your patience.",
      });
    }

    res.status(200).json({
      id: preparedTransaction.id,
      message: "Created successfully without a hitch",
    });
  }),
};

export default rantController;
