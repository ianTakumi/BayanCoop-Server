import { supabase } from "../utils/supabase_client.js";
import { uploadImageToSupabase } from "../utils/helpers.js";

// Constants
const EVENT_TYPES = {
  SEMINAR: "seminar",
  WEBINAR: "webinar",
  TRAINING: "training",
  WORKSHOP: "workshop",
  CONFERENCE: "conference",
};

const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  ARCHIVED: "archived",
};

// Get all events
export const getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      eventType,
      status,
      isOnline,
      upcomingOnly,
      search,
      includeArchived = "false", // New parameter
    } = req.query;

    let query = supabase.from("events").select("*", { count: "exact" });

    // Apply filters
    if (eventType) query = query.eq("event_type", eventType);
    if (status) query = query.eq("status", status);
    if (isOnline) query = query.eq("is_online", isOnline === "true");

    if (upcomingOnly === "true") {
      query = query.gte("start_date", new Date().toISOString());
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Exclude archived events unless explicitly included
    if (includeArchived !== "true") {
      query = query.neq("status", "archived");
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    query = query.range(from, to).order("start_date", { ascending: true });

    const { data: events, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get single event
export const getEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Create event with file upload
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
      event_type,
      location,
      is_online,
      meeting_link,
      venue,
      max_attendees,
      registration_deadline,
      status = "draft",
      featured_image,
    } = req.body;

    // Validation
    if (!title || !start_date || !end_date || !event_type) {
      return res.status(400).json({
        success: false,
        error: "Title, start date, end date, and event type are required",
      });
    }

    // Validate event type
    const validEventTypes = Object.values(EVENT_TYPES);
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid event type. Must be one of: ${validEventTypes.join(
          ", "
        )}`,
      });
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert([
        {
          title,
          description,
          start_date,
          end_date,
          start_time,
          end_time,
          event_type,
          location,
          is_online: is_online || false,
          meeting_link,
          venue,
          max_attendees: max_attendees ? parseInt(max_attendees) : null,
          featured_image,
          registration_deadline,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: event,
      message: "Event created successfully",
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update event with file upload
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    // Handle file upload if present
    if (req.file) {
      updates.featured_image = await uploadImageToSupabase(req.file, "events");

      // If uploading new file, delete old image from storage if it exists
      if (
        req.body.old_featured_image &&
        req.body.old_featured_image.includes("supabase.co")
      ) {
        try {
          const oldImagePath =
            req.body.old_featured_image.split("/uploads/")[1];
          await supabase.storage.from("uploads").remove([oldImagePath]);
        } catch (deleteError) {
          console.warn("Could not delete old image:", deleteError.message);
          // Continue with update even if delete fails
        }
      }
    }

    // Validate event type if provided
    if (updates.event_type) {
      const validEventTypes = Object.values(EVENT_TYPES);
      if (!validEventTypes.includes(updates.event_type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid event type. Must be one of: ${validEventTypes.join(
            ", "
          )}`,
        });
      }
    }

    // Parse max_attendees if provided
    if (updates.max_attendees) {
      updates.max_attendees = parseInt(updates.max_attendees);
    }

    const { data: event, error } = await supabase
      .from("events")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    res.json({
      success: true,
      data: event,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Archive event
export const archiveEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error } = await supabase
      .from("events")
      .update({
        status: EVENT_STATUS.ARCHIVED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    res.json({
      success: true,
      data: event,
      message: "Event archived successfully",
    });
  } catch (error) {
    console.error("Error archiving event:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete event permanently
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Event deleted permanently",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get upcoming events
export const getUpcomingEvents = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .gte("start_date", new Date().toISOString())
      .eq("status", EVENT_STATUS.PUBLISHED)
      .order("start_date", { ascending: true })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get events by date range
export const getEventsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.params;

    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .gte("start_date", startDate)
      .lte("end_date", endDate)
      .order("start_date", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching events by date range:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get events statistics
export const getEventsStats = async (req, res) => {
  try {
    const { data: events, error } = await supabase.from("events").select("*");

    if (error) throw error;

    const stats = {
      total: events.length,
      byType: {},
      byStatus: {},
      upcoming: events.filter(
        (event) =>
          new Date(event.start_date) > new Date() &&
          event.status === EVENT_STATUS.PUBLISHED
      ).length,
      online: events.filter((event) => event.is_online).length,
      offline: events.filter((event) => !event.is_online).length,
    };

    // Count by type
    Object.values(EVENT_TYPES).forEach((type) => {
      stats.byType[type] = events.filter(
        (event) => event.event_type === type
      ).length;
    });

    // Count by status
    Object.values(EVENT_STATUS).forEach((status) => {
      stats.byStatus[status] = events.filter(
        (event) => event.status === status
      ).length;
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching events stats:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
