const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const projectSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    registeredProjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    }],
    nfts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "NFT",
    }],
    merch: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Merch",
    }],
    trades: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trade",
    }],
    cart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cart",
    },
    currency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Currency",
    }
});

projectSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
