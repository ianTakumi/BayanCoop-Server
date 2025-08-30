import Cooperative from "../models/cooperative.model.js";

// Registration
export const cooperativeRegistration = async (req, res) => {
  try {
    const { name, email, phoneNumber, address, password } = req.body;

    if (!name || !email || !phoneNumber || !password || !address) {
      return res.status(400).json({
        message: "Please provide all the necessary fields",
        success: false,
      });
    }

    const cooperative = await Cooperative.findOne({ email: email });

    if (!cooperative) {
      const newCooperative = new Cooperative({
        name,
        email,
        phoneNumber,
        address,
        password,
      });

      await newCooperative.save();
      return res.status(200).json({
        message: "Successfully created cooperative account",
        success: true,
      });
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

// Verify email
export const cooperativeVerifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(404).json({ message: "No token pass to the request" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const cooperative = Cooperative.findById(decoded.id);

    if (!cooperative) {
      return res.status(404).json({ message: "No cooperative found" });
    }

    cooperative.status = "verified";
    await cooperative.save();
    return res.status(200).json({ message: "Email verified", success: true });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};
