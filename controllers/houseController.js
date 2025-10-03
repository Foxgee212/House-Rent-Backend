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