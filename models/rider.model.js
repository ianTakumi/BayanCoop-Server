import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const riderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter the rider's name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please enter the rider's email"],
      unique: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Please enter the rider's phone number"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter the rider's password"],
      select: false,
      minlength: [6, "Password must be at least 6 characters long"],
    },
  },
  { timestamps: true }
);

// Hash password before saving
riderSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // only hash if modified
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed one
riderSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate jwt token
riderSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const Rider = mongoose.model("Rider", riderSchema);

export default Rider;
