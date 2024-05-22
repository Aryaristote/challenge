const mongoose = require("mongoose");
const { handleAsync } = require("../helpers/handleAsync");
const Entry = require("../models/Entry");
const NFT = require("../models/NFT");
const web3 = require("@solana/web3.js");
let connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));

// Todo 
const User = require("../models/User");
const Project = require("../models/Project");

const saveEntry = handleAsync(async (req, res) => {
  const { address, id, value, transactionId, type } = req.body;
  const toPubkey = "BVmdx6PdToCmGcSPUaFCXzrzbrSzRrecbAXS7xgREdDq";
  const nftData = await NFT.findOne({ id });

  if (!nftData) {
    return res.status(400).json({ message: "Invalid NFT ID" });
  }

  const data = await connection.getParsedTransaction(transactionId);
  if (!data) {
    return res.status(400).json({ message: "Invalid Transaction ID" });
  }

  if (!data.transaction?.message?.instructions?.[0]?.parsed?.info) {
    return res.status(400).json({ message: "Invalid Transaction Structure" });
  }

  let isValid = false;
  const instructions = data.transaction.message.instructions[0].parsed.info;

  if (type === "sol") {
    const info = instructions.info;
    nftData.ticketPrice.forEach((element) => {
      if (
        info.destination.toLowerCase() === toPubkey.toLowerCase() &&
        info.lamports * 0.000000001 == element.price
      ) {
        isValid = true;
      }
    });
  } else if (type === "spl-token") {
    const info = data.meta.preTokenBalances;
    const transaction = instructions.info;
    nftData.ticketPrice.forEach((element) => {
      if (
        info[0].owner.toLowerCase() === toPubkey.toLowerCase() &&
        info[0].mint.toLowerCase() === element.token.toLowerCase() &&
        transaction.tokenAmount.amount * 0.000000001 == element.token
      ) {
        isValid = true;
      }
    });
  } else {
    return res.status(400).json({ message: "Invalid type of transaction" });
  }

  if (!isValid) {
    return res.status(400).json({ message: "Invalid type of transaction" });
  }

  const nft = await NFT.findById(id);
  if (!nft) {
    return res.status(400).json({ message: "Invalid NFT" });
  }

  const nftEntryExist = await Entry.findOne({ transactionId });
  if (nftEntryExist) {
    return res.status(400).json({ message: "Invalid Transaction" });
  }

  const entry = new Entry({
    walletAddress: address,
    nftId: id,
    amount: value,
    transactionId,
  });

  const savedEntry = await entry.save();
  if (savedEntry) {
    nft.ticketSolds = nft.ticketSolds + value;
    const updatedNFT = await nft.save();
    if (updatedNFT) {
      return res.status(201).json({ message: "Success", data: [] });
    }
  }
  return res.status(400).json({ message: "Invalid Request", data: [] });
});

const getAll = handleAsync(async (req, res) => {
  const { discord, twitter } = req.body;

  if (!discord && !twitter) {
    return res.status(400).json({ message: "All fields are required", data: [] });
  }

  const user = await User.findOne({ _id: req.user._id });
  if (!user) {
    return res.status(400).json({ message: "User not found", data: [] });
  }

  if (twitter) user.twitter = twitter;
  if (discord) user.discord = discord;

  const updatedUser = await user.save();
  if (updatedUser) {
    return res.status(200).json({ message: "Success", data: [] });
  }
  return res.status(400).json({ message: "Invalid Request", data: [] });
});

const getMyProjects = handleAsync(async (req, res) => {
  const projects = await User.findOne({ _id: req.user._id })
    .select("+registeredProjects")
    .populate("registeredProjects");

  if (projects) {
    return res.status(200).json({ message: "Success", data: projects });
  }
  return res.status(400).json({ message: "Invalid Request", data: [] });
});

const registerToProject = handleAsync(async (req, res) => {
  const { projectId } = req.body;
  const _id = req.user._id;

  const user = await User.findOne({ _id }).select("+registeredProjects");
  if (!user) {
    return res.status(400).json({ message: "User not found", data: [] });
  }

  const projectAlreadyExists = user.registeredProjects.some(
    (i) => i.toString() === projectId
  );

  if (projectAlreadyExists) {
    return res.status(400).json({
      message: "User has already registered to this project",
      data: [],
    });
  }

  const validProject = await Project.findOne({ _id: projectId });
  if (!validProject) {
    return res.status(400).json({ message: "Invalid Project ID" });
  }

  user.registeredProjects.push(projectId);
  const updatedUser = await user.save();
  if (updatedUser) {
    return res.status(200).json({ message: "Success", data: [] });
  }
  return res.status(400).json({ message: "Invalid Request", data: [] });
});

const getMyTickets = handleAsync(async (req, res) => {
  const { walletAddress, nftId } = req.body;
  if (!walletAddress || !nftId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const myTicket = await Entry.aggregate([
    {
      $match: {
        nftId: new mongoose.Types.ObjectId(nftId),
        walletAddress,
      },
    },
    {
      $group: {
        _id: "$walletAddress",
        totalTickets: { $sum: "$amount" },
      },
    },
    {
      $project: { _id: 0, totalTickets: 1 },
    },
  ]);

  if (!myTicket.length) {
    return res.status(404).json({ message: "No tickets found", data: [] });
  }

  return res.status(200).json({ message: "Success", data: myTicket[0] });
});

const pickWinner = handleAsync(async (req, res) => {
  const id = req.params.id;
  const entries = await Entry.find({ projectId: id });
  if (!entries.length) {
    return res.status(400).json({ message: "NFT doesn't have enough entries", data: [] });
  }

  const newArray = entries.flatMap((item) => Array(item.amount).fill(item.walletAddress));
  const randomIndex = Math.floor(Math.random() * newArray.length);
  const randomAddress = newArray[randomIndex];

  return res.status(200).json({ message: "Success", data: randomAddress });
});

module.exports = {
  getAll,
  saveEntry,
  pickWinner,
  getMyTickets,
  getMyProjects,
  registerToProject
};
