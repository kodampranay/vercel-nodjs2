import mongoose from "mongoose";
const userSchema=mongoose.Schema(
    {
        number:{
            type:String,
            required:true
        },
        otp:
        {
            type:String
        }
        ,
        name:
        {
            type:String,
            min:3

        }
        ,
        authkey:{
            type:String
        }
        ,profileimg:{
            type:String,
            default:''
        },
        friends:
        {
            type:Array,
            default:[]
        }
        ,pending:{
            type:Array,
            default:[]
        },
        requests:{
            type:Array,
            default:[]
        }

    }
    ,{
        timestamp:true
    }
)
const userModel=mongoose.model('user',userSchema)
export default userModel;