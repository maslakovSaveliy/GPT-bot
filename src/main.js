import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import { code } from "telegraf/format";
import config from "config";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import { removeFile } from "./utils.js";

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"));

bot.use(session());

bot.command("new", async (ctx) => {
  ctx.session = {
    messages: [],
  };
  await ctx.reply(code("Жду вашего сообщения!"));
});

bot.start(async (ctx) => {
  ctx.session = {
    messages: [],
  };
  await ctx.reply(
    code(`Жду вашего сообщения!
Для запуска нового диалога просто введите /new
  `)
  );
});

bot.on(message("voice"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    await ctx.reply(code("Выолнение запроса..."));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userID = String(ctx.message.from.id);
    const oggPath = await ogg.create(link.href, userID);
    const mp3Path = await ogg.toMp3(oggPath, userID);

    const text = await openai.transcription(mp3Path);
    removeFile(mp3Path);
    await ctx.reply(code(`Ващ запрос: ${text}`));
    ctx.session.messages.push({ role: openai.roles.USER, content: text });

    const res = await openai.chat(ctx.session.messages);
    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: res.content,
    });

    await ctx.reply(res.content);
  } catch (e) {
    console.log(e.message);
  }
});

bot.on(message("text"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    await ctx.reply(code("Выолнение запроса..."));

    ctx.session.messages.push({
      role: openai.roles.USER,
      content: ctx.message.text,
    });

    const res = await openai.chat(ctx.session.messages);
    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: res.content,
    });

    await ctx.reply(res.content);
  } catch (e) {
    console.log(e.message);
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
