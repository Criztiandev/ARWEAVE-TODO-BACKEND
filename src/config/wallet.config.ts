import fs from "fs";
import path from "path";

const walletPath = path.resolve(__dirname, "../../wallet.json");
const wallet = JSON.parse(fs.readFileSync(walletPath).toString());

export default wallet;
