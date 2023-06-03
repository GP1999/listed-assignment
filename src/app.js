/**
 * Find label in already available Labels. If not then create and return Id
 * @param {*} gmailService
 * @param {*} labelName
 * @returns
 */
async function getOrCreateLableId(gmailService, labelName) {
  const labels = await gmailService.listLabels();
  const label = labels.find((item) => item.name === labelName);

  if (!label) {
    const labelId = await gmailService.createLable(labelName);
    return labelId;
  }
  return label.id;
}

/**
 * This Function will fetch all the threads based on filter criteria.
 * Logic to find Without Reply is that .when we run our application first time it will
 * fetch all the threads . After parsing all threds it will check which thread has only 1 message
 * it will reply to that message and update LAbel TO REPLIED_TEST. NEXT Time function runs it will
 * only fetch threads which does not have label REPLIED_TEST,So that we can insure only 1 time
 * we send reply.
 * @param {*} gmailService
 * @param {*} lableName
 * @returns
 */
async function getThreadsWithoutReply(gmailService, lableName) {
  // Filter All Threads which does not have label(labelName) and it is index
  const queryString = `-label:${lableName} AND is:inbox`;
  const threads = await gmailService.listThreads(queryString);

  const threadsWithoutReply = [];
  for (let thread of threads) {
    if (thread.messages.length === 1) {
      const headerObject = thread.messages[0].payload.headers.reduce(
        //Extract info from last Message Payload
        (prev, current) => {
          if (current.name === "Reply-To") prev["replyTo"] = current.value;
          else if (current.name === "Subject") prev["subject"] = current.value;
          else if (current.name === "To") prev["selfEmail"] = current.value;
          else if (current.name === "From") prev["from"] = current.value;
          else if (current.name === "Message-ID")
            prev["message-id"] = current.value;
          return prev;
        },
        {}
      );
      if (headerObject.replyTo || headerObject.from) {
        threadsWithoutReply.push({
          id: thread.id,
          lastMessage: {
            replyTo: headerObject.replyTo || headerObject.from,
            subject: headerObject.subject,
            selfEmail: headerObject.selfEmail,
            messageId: headerObject["message-id"],
          },
        });
      }
    }
  }
  return threadsWithoutReply;
}

/**
 * This Fucniton will convert String to base64 .Google Apis only accept
 * base64 message payload for email
 * @param {*} param0
 * @returns
 */
function createReplyEmail({ to, from, subject, body, messageId }) {
  const message =
    `From: ${from}\n` +
    `To: ${to}\n` +
    `Cc: ${to}\n` +
    `Subject:Re: ${subject}\n` +
    `In-Reply-To: ${messageId}\n` + // This is import to mainatin message in thraed on both senders and receiver side
    `References: ${messageId}\n` + // This is import to mainatin message in thraed on both senders and receiver side
    `Content-Type: text/plain; charset="UTF-8"\n` +
    `MIME-Version: 1.0\n` +
    `\n` +
    `${body}`;
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Function is aggrigation of all steps.
 * 1.It Will Check is passed label is already there in users's Gmail accout or not . if not then it will create label
 * 2.get all the threads which needs reply
 * 3.reply to all message + update label of each thread
 * @param {*} gmailService
 * @param {*} lableName
 * @param {*} replyText
 */
async function replyToAllNonReplied(gmailService, lableName, replyText) {
  const labelId = await getOrCreateLableId(gmailService, lableName);
  const threadsToReply = await getThreadsWithoutReply(gmailService, lableName);
  console.log("Threads to reply: ", threadsToReply.length);

  const replyPromises = threadsToReply.map(async (thread) => {
    try {
      const message = createReplyEmail({
        to: thread.lastMessage.replyTo,
        from: thread.lastMessage.selfEmail,
        subject: thread.lastMessage.subject,
        body: replyText,
        messageId: thread.lastMessage.messageId,
      });
      await gmailService.replyToThread(thread, message, labelId);
      await gmailService.addLabelToThread(thread.id, labelId);
    } catch (error) {
      console.error(error);
    }
  });
  const response = await Promise.allSettled(replyPromises);
  console.log("Response:", response);
}

/**
 * This function runs like cron job. Between Each round it will have gape of INTERVAL
 * @param {*} gmailService
 * @param {*} labelName
 * @param {*} replyText
 */
export async function cronJob(
  gmailService,
  labelName,
  replyText,
  interval = 10000
) {
  console.log("Cron Job running....");
  await replyToAllNonReplied(gmailService, labelName, replyText);
  setTimeout(() => {
    cronJob(gmailService, labelName, replyText, interval);
  }, interval);
}
