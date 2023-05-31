import { Scenes } from "telegraf";
import { openai } from "./openai.js";

class SceneGenerator {
  GenImageScene() {
    const imageGenScene = new Scenes.BaseScene("imageGenScene");

    imageGenScene.enter((ctx) =>
      ctx.reply(
        "Я помогу тебе с генерацией изображений. Что ты хочешь увидеть?"
      )
    );

    imageGenScene.command("leave", async (ctx) => {
      await ctx.scene.leave();
    });

    imageGenScene.on("text", async (ctx) => {
      try {
        await ctx.reply("Выполняется запрос...");
        let prompt = await ctx.message.text;
        const res = await openai.ImageGenerate(prompt);
        console.log(res);
        if (res === undefined) {
          ctx.reply("Ошибка, попробуй ввести запрос заново");
        }
        await ctx.replyWithPhoto(res.data[0].url, "image.jpg");
        await ctx.reply(
          "Если хочешь выйти из генерации изображения используй /leave"
        );
      } catch (e) {
        console.log(e.message);
      }
    });

    imageGenScene.leave((ctx) => {
      ctx.reply(
        "Вы покинули генерацию изображений. Можете продолжить свой диалог"
      );
    });

    return imageGenScene;
  }
}

export default SceneGenerator;
