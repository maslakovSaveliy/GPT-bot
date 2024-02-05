import mongoose from "mongoose";

const User = new mongoose.Schema({
  id: { type: String, required: true },
  username: { type: String, required: true },
  timeStamp: { type: Date, required: true },
  date: { type: Date, required: true },
  chatId: { type: Number, required: true },
});

export default mongoose.model("User", User);
