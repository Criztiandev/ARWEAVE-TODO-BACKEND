import { NextFunction, Request, Response } from "express";
import arweave, { ardb } from "../config/arweave.config";
import appConfig from "../config/app.config";
import wallet from "../config/wallet.config";
import asyncHandler from "express-async-handler";
import { rantValidationSchema } from "../validation/rant.validation";
import { boolean } from "zod";

const rantController = {
  fetchAllRant: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!process.env.WALLET_ID) return;

        const { name, version } = appConfig;
        let result = await ardb
          .search("transactions")
          .tag("App-Name", name)
          .tag("App-Version", version)
          .from(process.env.WALLET_ID)
          .findAll();

        const rants = await Promise.all(
          result.map(async (items) => {
            const transactions = await arweave.transactions.getData(items.id, {
              decode: true,
              string: true,
            });

            return {
              id: items.id,
              rant: transactions,
            };
          })
        );

        res.status(200).json({
          payload: rants,
        });
      } catch (e) {
        console.log(e);
      }
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

        const payload = await arweave.createTransaction(
          { data: body?.rant || "Rant" },
          wallet
        );

        const { name, version } = appConfig;

        // Setting tags
        payload.addTag("Content-Type", "text/plain");
        payload.addTag("App-Name", name);
        payload.addTag("App-Version", version);

        //Signing token
        await arweave.transactions.sign(payload, wallet);

        // Posting the data
        const result = await arweave.transactions.post(payload);

        // check transaction status
        const status = await arweave.transactions.getStatus(payload.id);

        if (status.confirmed === null) {
          res.status(200).json({
            id: payload.id,
            ...result,
            message:
              "Your Rant is being processed. Please wait a moment while we load it. Thank you for your patience.",
          });
        }

        res.status(200).json({
          id: payload.id,
          ...result,
          message: "Created successfully without a hitch",
        });
      } catch (e) {
        throw new Error(e as any);
      }
    }
  ),

  greet: async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      message: "hi",
    });
  },
};

export default rantController;
