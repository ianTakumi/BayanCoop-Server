import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const cooperativeSchema = new mongoose.Schema(
  {
    name: {
      required: [true, "Please enter the cooperative name"],
      type: String,
      trim: true,
    },
    address: {
      required: [true, "Please enter the cooperative address"],
      type: String,
      trim: true,
    },
    email: {
      required: [true, "Please enter the cooperative email"],
      type: String,
      trim: true,
      unique: true,
      lowercase: true,
    },
    phoneNumber: {
      required: [true, "Please enter the cooperative phone number"],
      type: String,
      unique: true,
    },
    password: {
      required: [true, "Please enter the cooperative password"],
      type: String,
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
cooperativeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // only hash if modified
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed one
cooperativeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
cooperativeSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const Cooperative = mongoose.model("Cooperative", cooperativeSchema);

export default Cooperative;
