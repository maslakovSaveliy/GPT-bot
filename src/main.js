import { Telegraf, session, Scenes } from "telegraf";
import { message } from "telegraf/filters";
import { code } from "telegraf/format";
import config from "config";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import { removeFile } from "./utils.js";
import SceneGenerator from "./Scenes.js";
import mongoose from "mongoose";
import User from "./User.js";
import XLSX from "xlsx";

const curScene = new SceneGenerator();
const imageGenScene = curScene.GenImageScene();
const sendAllScene = curScene.GenSendAllScene();

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"), {
  handlerTimeout: Infinity,
});
const DB_URL =
  "mongodb+srv://user:user@cluster0.xf08cpi.mongodb.net/?retryWrites=true&w=majority";
const stage = new Scenes.Stage([imageGenScene, sendAllScene]);

mongoose
  .connect(DB_URL)
  .then(() => {
    console.log("DB Connect");
  })
  .catch((e) => {
    console.log(e);
  });

bot.use(session());
bot.use(stage.middleware());

bot.command("sendAll", async (ctx) => {
  if (ctx.from.username === "kazakevichr" || ctx.from.username === "eepppc") {
    ctx.scene.enter("sendAllScene");
  }
});

bot.command("users", async (ctx) => {
  try {
    if (ctx.from.username === "kazakevichr" || ctx.from.username === "eepppc") {
      const users = await User.find({});
      const workbook = XLSX.utils.book_new();
      const sheetData = [["ID", "Username"]];
      const arr = [];
      users.map((el) => {
        arr.push([`${el.id}`, `${el.username}`]);
      });
      const sheet = XLSX.utils.aoa_to_sheet([...sheetData, ...arr]);
      XLSX.utils.book_append_sheet(workbook, sheet, "Users");
      const excelFilePath = "./users.xlsx";
      XLSX.writeFile(workbook, excelFilePath);
      await ctx.replyWithDocument({ source: "./users.xlsx" });
      removeFile("./users.xlsx");
    }
  } catch (e) {
    console.log(e);
  }
});

bot.command("new", async (ctx) => {
  const userID = ctx.from.id;
  ctx.session = {
    [userID]: [],
  };
  await ctx.reply(code("Жду вашего сообщения!"));
});

// await ctx.getChatMember("@dobro_digital", ctx.chat.id)
// if (s.status === "left") {
// ctx.telegram.sendMessage(ctx.chat.id, "не подписан");

bot.command("image", async (ctx) => {
  ctx.scene.enter("imageGenScene");
});

bot.help(async (ctx) => {
  await ctx.reply(`/new - создание нового диалога
/image - переход в режим генерации изображений
/leave - выход из режима генерации изображений`);
});

bot.start(async (ctx) => {
  try {
    const userID = ctx.from.id;

    const userDB = await User.findOne({ id: userID });
    if (userDB === undefined || userDB === null) {
      await User.create({
        id: userID,
        username: ctx.from.username,
        chatId: ctx.chat.id,
      });
    }

    ctx.session = {
      [userID]: [],
    };
    await ctx.reply(
      code(`Жду вашего сообщения!
  Для запуска нового диалога просто введите /new
  Если хотите сгенерировать изображение введите /image
  Если понадобится помошь, введите /help
    `)
    );
  } catch (e) {
    console.log(e);
  }
});

bot.on(message("voice"), async (ctx) => {
  const userID = String(ctx.from.id);
  ctx.session ??= {
    [userID]: [],
  };
  try {
    const { message_id } = await ctx.reply("Выолнение запроса...");
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

    await ctx.reply(res.content);
    await ctx.telegram.deleteMessage(ctx.chat.id, message_id);
  } catch (e) {
    await ctx.reply("Произошла ошибка, перезагрузите бота командой /start");
    console.log(e.message);
  }
});

bot.on(message("text"), async (ctx) => {
  const userID = String(ctx.from.id);
  ctx.session ??= {
    [userID]: [],
  };
  try {
    const { message_id } = await ctx.reply("Выолнение запроса...");

    ctx.session[userID].push({
      role: openai.roles.USER,
      content: ctx.message.text,
    });

    console.log(ctx.session[userID]);
    const res = await openai.chat(ctx.session[userID]);
    ctx.session[userID].push({
      role: openai.roles.ASSISTANT,
      content: res.content,
    });

    await ctx.reply(res.content);
    await ctx.telegram.deleteMessage(ctx.chat.id, message_id);
  } catch (e) {
    await ctx.reply("Произошла ошибка, перезагрузите бота командой /start");
    console.log(e.message);
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
