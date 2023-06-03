import path from "path";
import process from "process";
import GoogleService from "./GoogleService.js";
import GmailService from "./GmailService.js";
import { cronJob } from "./app.js";

async function main() {
  //Google Project Credentials
  const CREDENTIALS_PATH = path.join(
    process.cwd(),
    "src/storage/credentials.json"
  );
  // Users Authorised Access  Token
  const TOKEN_PATH = path.join(process.cwd(), "src/storage/token.json");

  // This is are domains/scopes  required to access perticular resource. It decides
  // which permission we have on behalf of user. This will be Showen to users when pop up
  // apears for consent .
  const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
  ];
  const NEW_LABEL_NAME = "REPLIED_TEST";
  const AUTO_REPLY_TEXT = "HI there Just completing Listed Assignment";
  const CRON_INTERVAL = 10000; //10s
  try {
    const googleService = new GoogleService(
      CREDENTIALS_PATH,
      TOKEN_PATH,
      SCOPES
    );
    const client = await googleService.authorize();
    const gmailService = new GmailService(client);
    await cronJob(gmailService, NEW_LABEL_NAME, AUTO_REPLY_TEXT, CRON_INTERVAL);
  } catch (error) {
    console.error(error);
  }
}
main();
