import House from "../models/House.js";

export const createHouse = async (req, res)=>{
    const { title, location, price, description, image} = req.body;

    try{
        const newHouse = await House.create({
            title,
            location,
            price,
            description,
            image,
            landlord:req.user.id,
        });
        res.status(201).json(newHouse);
    }catch(err){
        res.status(500).json({error:err.message});

    }
};

export const getHouses = async (req, res) => {
  const houses = await House.find().populate("landlord", "email");
  res.json(houses);
};

export const getHouseById = async (req, res) => {
    const house = await House.findById(req.params.id).populate("landlord", "email");
    if(!house) return res.status(404).json({ message: "House not found"});
    res.json(house);
};

// Upadate house Availabilty 

export const updateAvailability = async (req, res)=>{
    const { id } = req.params;
    const { available } = req.body;


    try {
        const house = await House.findById(id);
        if(!house) return res.status(404).json({ message: "House not found"});

        //optional: Ensure only landlord can update

        if(house.landlord.toString() !== req.user.id){
            return res.status(403).json({ message: "Unauthorized"});

        }

        house.available = available;

        await house.save();

        res.status(200).json({
            message: `House marked as ${available ? "available": "Occupied"}`,
            house,
        });
    } catch (error) {
        res.status(500).json({error: error.message})
    }
}