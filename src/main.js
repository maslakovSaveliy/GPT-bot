import { Telegraf, session, Scenes } from "telegraf";
import { message } from "telegraf/filters";
import { code } from "telegraf/format";
import config from "config";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import { removeFile } from "./utils.js";
import SceneGenerator from "./Scenes.js";

const curScene = new SceneGenerator();
const imageGenScene = curScene.GenImageScene();

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"));

const stage = new Scenes.Stage([imageGenScene]);

bot.use(session());
bot.use(stage.middleware());

bot.command("new", async (ctx) => {
  const userID = ctx.from.id;
  ctx.session = {
    [userID]: [],
  };
  await ctx.reply(code("Жду вашего сообщения!"));
});

bot.command("generateImage", async (ctx) => {
  ctx.scene.enter("imageGenScene");
});

bot.help(async (ctx) => {
  await ctx.reply(`/new - создание нового диалога
/generateImage - переход в режим генерации изображений
/leave - выход из режима генерации изображений`);
});

bot.start(async (ctx) => {
  const userID = ctx.from.id;
  ctx.session = {
    [userID]: [],
  };
  await ctx.reply(
    code(`Жду вашего сообщения!
Для запуска нового диалога просто введите /new
Если хотите сгенерировать изображение введите /generateImage
Если понадобится помошь, введите /help
  `)
  );
});

bot.on(message("voice"), async (ctx) => {
  const userID = String(ctx.from.id);
  ctx.session ??= {
    [userID]: [],
  };
  try {
    const { message_id } = await ctx.reply(code("Выолнение запроса..."));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userID = String(ctx.message.from.id);
    const oggPath = await ogg.create(link.href, userID);
    const mp3Path = await ogg.toMp3(oggPath, userID);

    const text = await openai.transcription(mp3Path);
    removeFile(mp3Path);
    await ctx.reply(code(`Ваш запрос: ${text}`));
    ctx.session[userID].push({ role: openai.roles.USER, content: text });

    const res = await openai.chat(ctx.session[userID]);
    ctx.session[userID].push({
      role: openai.roles.ASSISTANT,
      content: res.content,
    });

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      message_id,
      0,
      code("Ответ:")
    );
    await ctx.reply(res.content);
  } catch (e) {
    console.log(e.message);
  }
});

bot.on(message("text"), async (ctx) => {
  const userID = String(ctx.from.id);
  ctx.session ??= {
    [userID]: [],
  };
  try {
    const { message_id } = await ctx.reply(code("Выолнение запроса..."));

    ctx.session[userID].push({
      role: openai.roles.USER,
      content: ctx.message.text,
    });

    const res = await openai.chat(ctx.session[userID]);
    ctx.session[userID].push({
      role: openai.roles.ASSISTANT,
      content: res.content,
    });

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      message_id,
      0,
      code("Ответ:")
    );
    await ctx.reply(res.content);
  } catch (e) {
    console.log(e.message);
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
