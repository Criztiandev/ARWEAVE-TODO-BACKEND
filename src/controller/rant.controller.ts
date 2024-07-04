import { json, NextFunction, Request, Response } from "express";
import arweave, { ardb } from "../config/arweave.config";
import walletConfig from "../config/wallet.config";
import appConfig from "../config/app.config";
import wallet from "../config/wallet.config";

const rantController = {
  fetchAllRant: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!process.env.WALLET_ID) return;

      let result = await ardb
        .search("transactions")
        .tag("App-Name", appConfig.name)
        .from(process.env.WALLET_ID)
        .findAll();

      const rants = await Promise.all(
        result.map(async (items) => {
          const status = await arweave.transactions.getStatus(items.id);

          if (status.confirmed === null) {
            console.log(`Transaction ${items.id} is not confirmed. Skipping.`);
            return {
              id: items.id,
              rant: null,
            };
          }

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
        payload: rants.filter((items) => items?.rant !== null),
      });
    } catch (e) {
      console.log(e);
    }
  },

  createRant: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;

      const payload = await arweave.createTransaction(
        { data: body?.rant || "Rant" },
        wallet
      );

      // Setting tags
      payload.addTag("Content-Type", "text/plain");
      payload.addTag("App-Name", appConfig.name);
      payload.addTag("App-Version", "v1");
      payload.addTag("Type", "Rant");

      //Signing token
      await arweave.transactions.sign(payload, wallet);

      // Posting the data
      const result = await arweave.transactions.post(payload);

      res.status(200).json({
        id: payload.id,
        ...result,
      });
    } catch (e) {
      throw new Error(e as any);
    }
  },

  greet: async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      message: "hi",
    });
  },
};

export default rantController;
