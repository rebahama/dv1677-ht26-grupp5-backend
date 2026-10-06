import { ObjectId } from "mongodb";

export function validateBooking(booking) {
    if (!booking.resourceId) {
      return {
        valid: false,
        error: "resourceId is required",
      };
    }

    if (!ObjectId.isValid(booking.resourceId)) {
        return {
          valid: false,
          error: "resourceId must be a valid id",
        };
    }

    if (!booking.bookedBy) {
      return {
        valid: false,
        error: "bookedBy is required",
      };
    }
  
    if (!booking.startsAt) {
      return {
        valid: false,
        error: "startsAt is required",
      };
    }
  
    if (!booking.endsAt) {
      return {
        valid: false,
        error: "endsAt is required",
      };
    }
  
    const start = new Date(booking.startsAt);
  
    if (Number.isNaN(start.getTime())) {
      return {
        valid: false,
        error: "startsAt must be a valid date",
      };
    }
  
    const end = new Date(booking.endsAt);
  
    if (Number.isNaN(end.getTime())) {
      return {
        valid: false,
        error: "endsAt must be a valid date",
      };
    }
  
    if (start >= end) {
      return {
        valid: false,
        error: "startsAt must be before endsAt",
      };
    }
  
    return {
      valid: true,
    };
  }