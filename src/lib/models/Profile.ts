import mongoose from "mongoose"

// Define Profile Schema
const ProfileSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  username: { type: String, unique: false, sparse: true }, // @todo check if profile exists
  email: { type: String, required: false, unique: true, sparse: true },
  safeAddress: { type: String, required: true, default: "0x" },
  privateKey: { type: String, default: "" },
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

// Clear cached model to ensure schema changes are applied
if (mongoose.models.Profile) {
  delete mongoose.models.Profile;
}

export const Profile = mongoose.model("Profile", ProfileSchema)
