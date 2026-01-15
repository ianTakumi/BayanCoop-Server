import axios from "axios";

const createPaymongoLink = async () => {
  try {
    const response = await axios.post(
      "https://api.paymongo.com/v1/links",
      {
        data: {
          attributes: {
            amount: 10000, // ₱100 (in cents)
            description: "Payment for Order #123",
            remarks: "Optional remarks",
          },
        },
      },
      {
        auth: {
          username: "#skgoeshere",
          password: "",
        },
      }
    );

    console.log("Payment Link:", response.data.data.attributes.checkout_url);
    return response.data;
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
};

createPaymongoLink();
