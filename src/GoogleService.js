import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import fs from "fs/promises";

/**
 * This Class bundles all the operation Require to maintain authenticated Google instance w
 * which can be used by Other Service to work with Google APIS. We can use this class to
 * access different Google services
 */
class GoogleService {
  #client = null;
  #TOKEN_PATH = null;
  #CREDENTIALS_PATH = null;
  #SCOPES = [];
  constructor(credentialPath, tokenPath, scopes) {
    this.#TOKEN_PATH = tokenPath;
    this.#CREDENTIALS_PATH = credentialPath;
    this.#SCOPES = scopes;
  }
  /**
   * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
   *
   * @param {OAuth2Client} client
   * @return {Promise<void>}
   */
  async saveCredentials() {
    const content = await fs.readFile(this.#CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: this.#client.credentials.refresh_token,
    });
    await fs.writeFile(this.#TOKEN_PATH, payload);
  }
  /**
   * Reads previously authorized credentials from the save file.
   *
   * @return {Promise<OAuth2Client|null>}
   */
  async loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(this.#TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }
  /**
   * Load or request or authorization to call APIs.
   *
   */
  async authorize() {
    this.#client = await this.loadSavedCredentialsIfExist();
    if (this.#client) {
      return this.#client;
    }
    this.#client = await authenticate({
      scopes: this.#SCOPES,
      keyfilePath: this.#CREDENTIALS_PATH,
    });
    if (this.#client.credentials) {
      await this.saveCredentials();
    }
    return this.#client;
  }
  async getClient() {
    return this.#client;
  }
}

export default GoogleService;
