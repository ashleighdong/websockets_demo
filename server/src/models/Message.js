import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 8000 },
    author: { type: String, trim: true, default: "anonymous", maxlength: 128 },
    roomId: { type: String, trim: true, default: "default", index: true },
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
