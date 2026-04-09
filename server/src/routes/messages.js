import { Router } from "express";
import { Message } from "../models/Message.js";

export const messagesRouter = Router();

messagesRouter.get("/", async (req, res, next) => {
  try {
    const roomId = typeof req.query.roomId === "string" ? req.query.roomId : "default";
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const items = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ messages: items.reverse() });
  } catch (err) {
    next(err);
  }
});

messagesRouter.post("/", async (req, res, next) => {
  try {
    const { body, author, roomId } = req.body ?? {};
    if (typeof body !== "string" || !body.trim()) {
      res.status(400).json({ error: "body is required" });
      return;
    }
    const doc = await Message.create({
      body: body.trim(),
      author: typeof author === "string" ? author.trim() : undefined,
      roomId: typeof roomId === "string" && roomId.trim() ? roomId.trim() : "default",
    });
    res.status(201).json({ message: doc.toObject() });
  } catch (err) {
    next(err);
  }
});
