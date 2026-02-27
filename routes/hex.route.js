import express from 'express';
import { getHex } from '../controller/hex.controller.js';

const hexRouter = express.Router();

hexRouter.get("/hexes", getHex);

export default hexRouter;