import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["landlord", "tenant", "admin"],
        default: "tenant",
    },
    location: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        default: "",
    },
    phone: {
        type: String,
        default: "",

    },
    profilePic: {
        type: String,
        default: "",
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });


const User = mongoose.model("User", userSchema);
export default User;