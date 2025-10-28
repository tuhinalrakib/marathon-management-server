import mongoose from "mongoose";

const marathonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title is requird"]
    },
    description: {
        type: String,
        required: [true, "Title is requird"]
    },
    image: {
        type: String,
        required: [true, "Image is required"],
    },
    location: {
        type: String,
        required: true
    },
    startMarathonDate: {
        type: Date,
        required: [true, "Start Marathon Date is required"]
    },
    registrationStartDate: {
        type: Date,
        required: [true, "Registration Start Date is required"]
    },
    registrationEndDate: {
        type: Date,
        required: [true, "Registration End Date is required"]
    },
    fees: {
        type: Number,
        required: [true, "Fees is required"]
    },
},
    { timestamps: true }
)

export default mongoose.model("Marathon", marathonSchema);