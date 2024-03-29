import { Configuration, OpenAIApi } from "openai";
import config from "config";
import { createReadStream } from "fs";

class OpenAI {
  roles = {
    ASSISTANT: "assistant",
    USER: "user",
    SYSTEM: "system",
  };

  constructor(apiKey) {
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
  }

  async chat(messages) {
    try {
      const res = await this.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
      });
      console.log(res)
      return res;
    } catch (e) {
      console.log(e);
    }
  }

  async transcription(filepath) {
    try {
      const res = await this.openai.createTranscription(
        createReadStream(filepath),
        "whisper-1"
      );
      return res.data.text;
    } catch (e) {
      console.log(e.message);
    }
  }

  async ImageGenerate(prompt) {
    try {
      const res = await this.openai.createImage({
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });
      return res.data;
    } catch (e) {
      console.log(e.message);
    }
  }
}

export const openai = new OpenAI(config.get("OPENAI_KEY"));
