import mongoose from "mongoose"

// Define Profile Schema
const ProfileSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  username: { type: String, unique: false, sparse: true }, // @todo check if profile exists
  email: { type: String, required: true, unique: true },
  safeAddress: { type: String, default: "0x" },
  description: { type: String, default: "" },
  avatarImageUrl: { type: String, default: "" },
  location: { type: String, default: "" },
  links: [
    {
      name: { type: String },
      icon: { type: String },
      link: { type: String },
    },
  ],
  type: {
    type: String,
    enum: ["Open", "Private"],
    default: "Open",
  },
})

export const Profile =
  mongoose.models.Profile || mongoose.model("Profile", ProfileSchema)
