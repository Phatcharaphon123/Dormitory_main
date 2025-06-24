const express = require("express");
const router = express.Router();
const { createDormWithRooms,getAllDorms,getAllRoom,getRoomsByDormId,getDormById,updateDorm } = require("../controllers/dormController");

router.post("/createDormitory", createDormWithRooms);
router.get('/getDorm', getAllDorms);
router.get('/getDorm/:dormId', getDormById);
router.get('/getAllRoom', getAllRoom);
router.get("/getAllRoom/:dormId", getRoomsByDormId);
router.put("/updateDorm/:dormId", updateDorm); 

module.exports = router;
