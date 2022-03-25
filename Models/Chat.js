import mongoose from "mongoose";
const chatSchema=mongoose.Schema(
    {
        sender:{
            type:String,
            required:true,
        },
        reciever:{
            type:String,
            required:true,
        },
        messages:{
            type:Array,
            default:[]

        }

    }
    ,{
        timestamp:true
    }
)
const chatModel=mongoose.model('chat',chatSchema)
export default chatModel;