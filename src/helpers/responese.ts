import { Response } from "express";

export const sendError = (res: Response, status: number, message: string) => res.status(status).json({ message});

export const sendSuccess = (res: Response, data: any) => res.status(200).json(data)