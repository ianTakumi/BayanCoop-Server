import { supabase } from "../utils/supabase_client.js";

// const supportStatus = [
//   'open',        // New inquiry
//   'in_progress', // Being handled
//   'resolved',    // Issue solved
//   'closed',      // Ticket closed
//   'pending'      // Waiting for response
// ];

// Get total count of contacts
export const getTotalCount = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    return res.status(200).json({
      message: "Total contact count fetched successfully",
      total: count,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get all contacts for admin
export const getContacts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      message: "Contacts fetched successfully",
      data,
      count: data?.length || 0,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

export const createContact = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      subject,
      custom_subject,
      message,
    } = req.body;

    const contactData = {
      firstName,
      lastName,
      email,
      phone,
      message,
      subject, // Will be "General Inquiry", "Order Inquiry", or "Other"
      custom_subject, // Will be null for predefined, custom text for "Other"
    };

    const { data: newContact, error } = await supabase
      .from("contacts")
      .insert(contactData)
      .select();

    if (error) throw error;

    if (global.io) {
      global.io.emit("new-contact-notification", {
        contact: newContact,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      message: "Contact created successfully",
      data: newContact[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update status contact
export const updateContact = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params; // Get ID from URL parameters

    if (!status || !id) {
      return res.status(400).json({ message: "Please fill up all the fields" });
    }

    const { data, error } = await supabase
      .from("contacts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) throw error;

    return res.status(200).json({
      message: "Contact updated successfully",
      data: data[0],
    });
  } catch (err) {
    console.error("Update contact error:", err.message);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
