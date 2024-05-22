const mongoose = require("mongoose");
const web3 = require("@solana/web3.js");
let connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));
const { handleAsync } = require("../helpers/handleAsync");
const Cart = require("../models/Cart");
const Merch = require("../models/Merch");
const Color = require("../models/Color");
const Size = require("../models/Size");
const Trade = require("../models/Trade");
const Promise = require("bluebird");

// Helper function to fetch cart details
const fetchCartDetails = async (cart) => {
    const merch = await Merch.findById(cart.merchId);
    const color = await Color.findById(cart.colorId);
    const size = await Size.findById(cart.sizeId);

    return {
        ...cart._doc,
        title: merch?.title || "",
        description: merch?.description || "",
        imageUrl: color?.imageUrl || "",
        size: size?.size || "",
        totalAmount: size?.amount || 0,
        price: size?.merchPrice || 0
    };
};

const getCart = handleAsync(async (req, res) => {
    const { userId } = req.params;

    const cartResult = await Cart.find({ userId });
    if (cartResult) {
        const detailResult = await Promise.map(cartResult, fetchCartDetails);
        return res.status(200).json({ message: "Success", data: detailResult });
    }
    return res.status(400).json({ message: "Invalid Request", data: [] });
});

const getCartNum = handleAsync(async (req, res) => {
    const { userId } = req.body;

    const cartResult = await Cart.find({ userId });
    if (cartResult) {
        return res.status(200).json({ message: "Success", data: cartResult.length });
    }
    return res.status(400).json({ message: "Invalid Request", data: [] });
});

const addMerch = handleAsync(async (req, res) => {
    const cart = new Cart(req.body);
    const result = await Cart.findOne({ userId: cart.userId, sizeId: cart.sizeId, tokenIndex: cart.tokenIndex });

    let saveCart;
    if (result) {
        result.amount++;
        saveCart = await result.save();
    } else {
        saveCart = await cart.save();
    }
    if (saveCart) {
        return res.status(200).json({ message: "Success", data: [] });
    }
    return res.status(400).json({ message: "Invalid Request", data: [] });
});

const increaseAmount = handleAsync(async (req, res) => {
    const { _id, amount } = req.body;

    const result = await Cart.findByIdAndUpdate(_id, { $set: { amount } }, { new: true });
    if (result) {
        return res.status(200).json({ message: "Success", data: [] });
    }
    return res.status(400).json({ message: "Invalid Request", data: [] });
});

const removeMerch = handleAsync(async (req, res) => {
    const { sizeId, userId } = req.query;

    const result = await Cart.deleteMany({ userId, sizeId });
    if (result.deletedCount > 0) {
        return res.status(200).json({ message: "Success", data: [] });
    }
    return res.status(400).json({ message: "Invalid Request", data: [] });
});

const buyAll = handleAsync(async (req, res) => {
    const { userId, address, transactionId, type, tokenIndex } = req.body;
    const toPubkey = "BVmdx6PdToCmGcSPUaFCXzrzbrSzRrecbAXS7xgREdDq";
    const data = await connection.getParsedTransaction(transactionId);

    if (!data) {
        return res.status(400).json({ message: "Invalid Transaction ID" });
    }

    // Fetch merch data for price validation
    const cartItems = await Cart.find({ userId, tokenIndex });
    const merchData = await Promise.map(cartItems, async (cartItem) => {
        const merch = await Merch.findById(cartItem.merchId);
        return {
            price: merch.merchPrice,
            token: merch.token
        };
    });

    const validateTransaction = (info, merchPrices) => {
        return merchPrices.some(element =>
            info.destination.toLowerCase() === toPubkey.toLowerCase() && info.lamports * 0.000000001 === element.price
        );
    };

    const validateSplTokenTransaction = (info, transaction, merchPrices) => {
        return merchPrices.some(element =>
            info[0].owner.toLowerCase() === toPubkey.toLowerCase() &&
            info[0].mint.toLowerCase() === element.token.toLowerCase() &&
            transaction.tokenAmount.amount * 0.000000001 === element.token
        );
    };

    let isValid = false;
    if (type === "Sol" && data.transaction.message.instructions[0].parsed.info) {
        isValid = validateTransaction(data.transaction.message.instructions[0].parsed.info, merchData);
    } else if (type === "spl-token" && data.transaction.message.instructions[0].parsed.info) {
        isValid = validateSplTokenTransaction(data.meta.preTokenBalances, data.transaction.message.instructions[0].parsed.info, merchData);
    }

    if (!isValid) {
        return res.status(400).json({ message: "Invalid type of transaction" });
    }

    const soldAt = new Date();

    const cartResult = await Cart.find({ userId, tokenIndex });
    if (cartResult) {
        await Promise.map(cartResult, async cart => {
            const merch = await Merch.findById(cart.merchId);
            const color = await Color.findById(cart.colorId);
            const size = await Size.findById(cart.sizeId);

            const trade = new Trade({
                walletAddress: address,
                colorId: color._id,
                sizeId: size._id,
                merchId: merch._id,
                userId,
                amount: cart.amount,
                transactionId,
                soldAt,
                completed: 0,
            });

            const savedTrade = await trade.save();
            if (savedTrade) {
                size.amount -= cart.amount;
                await size.save();
                await Cart.findByIdAndRemove(cart._id);
            }
        });
        return res.status(200).json({ message: "Success" });
    }
    return res.status(400).json({ message: "Invalid Request", data: [] });
});

module.exports = {
    getCart,
    addMerch,
    removeMerch,
    buyAll,
    increaseAmount,
    getCartNum
};
