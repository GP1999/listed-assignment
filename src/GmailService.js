import { google } from "googleapis";

/**
 * This class bundles all the operation we need to perform in Gamil Service.
 * Constructor requires Google Service instance  for Authorisation
 */
class GmailService {
  #googleClient;
  #gmail;
  constructor(client) {
    this.#googleClient = client;
    this.#gmail = google.gmail({ version: "v1", auth: this.#googleClient });
  }
  /**
   * Lists the labels in the user's account.
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
  async listLabels() {
    const res = await this.#gmail.users.labels.list({
      userId: "me",
    });
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
      console.log("No labels found.");
      return [];
    }
    const labelsArray = labels.map((label) => {
      return {
        id: label.id,
        name: label.name,
      };
    });
    return labelsArray;
  }

  /**
   *
   * It fetches All the threads based on filter String
   * @param {string} filterString
   * @returns array of all threads with all info
   */
  async listThreads(filterString) {
    const res = await this.#gmail.users.threads.list({
      userId: "me",
      q: filterString,
    });
    const dataPromises = res.data?.threads?.map(async (thread) => {
      const threadResponse = await this.#gmail.users.threads.get({
        userId: "me",
        id: thread.id,
      });

      return threadResponse.data;
    });
    const data = await Promise.all(dataPromises || []);
    return data;
  }

  /**
   *  create label with passed lableName and return id
   * @param {*} lableName
   * @returns labelId
   */
  async createLable(lableName) {
    const res = await this.#gmail.users.labels.create({
      userId: "me",
      requestBody: {
        name: lableName,
        messageListVisibility: "show",
        labelListVisibility: "labelShow",
      },
    });
    return res.data.id;
  }
  /**
   * Attach label to thread
   * @param {*} threadId
   * @param {*} labelId
   */
  async attachLableToThread(threadId, labelId) {
    await this.#gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
  }

  /**
   * Reply in thread.
   * @param {*} thread  it is object which containts thread info . Message will be sent on this thread
   * @param {*} replyMessage  it should be based64 encoded string
   * @param {*} labelId
   */
  async replyToThread(thread, replyMessage, labelId) {
    const requestBody = {
      threadId: thread.id,
      raw: replyMessage,
      labelIds: labelId && [labelId],
    };
    await this.#gmail.users.messages.send({
      userId: "me",
      requestBody,
    });
  }

  /**
   * Add label in thread
   * @param {*} threadId
   * @param {*} labelId
   */
  async addLabelToThread(threadId, labelId) {
    await this.#gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
  }
}
export default GmailService;
