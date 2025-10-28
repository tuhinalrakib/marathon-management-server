import Marathon from "../models/Marathon.js";
import asyncHandler from "express-async-handler";

// Add a new marathon
export const addMarathon = asyncHandler(async (req, res) => {
  const { title, description, image, location, startMarathonDate, registrationStartDate, registrationEndDate, fees } = req.body;

  const startDate = new Date(startMarathonDate);
  const regStart = new Date(registrationStartDate);
  const regEnd = new Date(registrationEndDate);

  // Validation: Registration dates must be before marathon start
  if (regStart >= startDate || regEnd >= startDate) {
    return res.status(400).json({ message: "Registration dates must be before Marathon Start Date" });
  }

  const marathon = await Marathon.create({
    title,
    description,
    image,
    location,
    startMarathonDate: startDate,
    registrationStartDate: regStart,
    registrationEndDate: regEnd,
    fees
  });

  res.status(201).json({ message: "Marathon added successfully", marathon });
});
