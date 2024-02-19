import { unlink } from "fs/promises";
import { Telegraf } from "telegraf";
import config from "config";

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"), {
  handlerTimeout: Infinity,
});

export async function removeFile(path) {
  try {
    await unlink(path);
  } catch (e) {
    console.log(e.message);
  }
}

export async function subscribeCheck(ctx, next) {
  const pass = await bot.telegram.getChatMember("@dobro_digital", ctx.chat.id);
  if (pass.status === "left") {
    ctx.reply("Для использования подпишись на https://t.me/dobro_digital");
  } else {
    next();
  }
}
