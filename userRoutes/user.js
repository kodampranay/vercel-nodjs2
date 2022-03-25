import axios from "axios";
import express from "express";
import userModel from "../Models/user.js";
import jwt from "jsonwebtoken";
import path from "path";
import imagemin from "imagemin";
import imageminWebp from "imagemin-webp";
// import { send } from "process";
import chatModel from "../Models/Chat.js";
const router = express.Router();






//REGISTERING WITH NUMBER
router.post("/api/register", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number)
      return res
        .status(200)
        .send({ status: 0, message: "Please Enter number" });
    if (!number.match(/^[6-9][0-9]{9}$/))
      return res.status(200).send({ status: 0, message: "Invalid Number" });

    //CHECKING NUMBER IN DATABASE
    const numberInfo = await userModel.findOne({ number });

    if (!numberInfo) {
      console.log("you are in");
      const otp = randomotpgen();
      const newNumber = await new userModel({
        number,
        otp,
      });

      const userInfo = await newNumber.save();
      if (userInfo) {
        sendotp(number, otp);
        return res.status(200).send({ status: 1, message: "otp was send" });
      } else {
        return res
          .status(400)
          .send({ status: 0, message: "something went wrong" });
      }
    } else {
      const otp = randomotpgen();
      const updateUser = await userModel.updateOne(
        { number },
        { $set: { otp } }
      );

      if (updateUser) {
        sendotp(number, otp);
        return res.status(200).send({ status: 1, message: "otp was send" });
      } else {
        return res
          .status(400)
          .send({ status: 0, message: "something went wrong" });
      }
    }
  } catch (err) {
    return res.status(400).send({ status: 0, err });
  }
});

//RANDOM OTP GENERATING
function randomotpgen() {
  return Math.floor(100000 + Math.random() * 900000);
}

//SENDING OTP

async function sendotp(number, otp) {
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.apikey}&variables_values=${otp}&route=otp&numbers=${number}`;

  const sendStatus = await axios.get(url);
  console.log(sendStatus);
}

//LOGIN ROUTE
router.post("/api/login", async (req, res) => {
  try {
    const { number, otp } = req.body;
    
    if (!number)
      return res
        .status(400)
        .send({ status: 0, message: "Please Enter number" });
    if (!otp)
      return res.status(400).send({ status: 0, message: "Please Enter otp" });
    if (!number.match(/^[6-9][0-9]{9}$/))
      return res.status(400).send({ status: 0, message: "Invalid Number" });

    if (!otp.match(/^[0-9]{6}$/))
      return res.status(400).send({ status: 0, message: "otp is invalid" });

    //CHECKING NUMBER IN DATABASE
    const numberInfo = await userModel.findOne({ number });
    // console.log(numberInfo.id)
    if (numberInfo) {
      if (otp === numberInfo.otp) {
        const authkey = await generating_AuthKey(numberInfo.id);
          console.log('authkey',authkey)
        const userUpdate = await userModel.findByIdAndUpdate(
          numberInfo.id ,
           {
              authkey: authkey,
              otp: authkey + process.env.otpmismatch,
            },
          
        );
        console.log(userUpdate)
        console.log(numberInfo.id);
        const userDetails = await userModel.findById( numberInfo.id );
        console.log(userDetails);
        const { number, otp, ...others } = userDetails._doc;

        return res
          .status(200)
          .send({ status: 1, message: "login success", data: others });
      } else {
        return res.status(200).send({ status: 0, message: "otp was wrong" });
      }
    } else {
      return res
        .status(400)
        .send({ status: 0, message: "you are not registred" });
    }
  } catch (err) {
    return res.status(400).send({ status: 0, err: "something went wrong" });
  }
});

//AUTHKEY GENERATING

function generating_AuthKey(id) {
  var token = jwt.sign({ id }, process.env.privatekey);
  console.log(id)
  console.log(token);
  return token;
}

//CHECKING AUTHENTICATION

router.get("/api/auth", async (req, res) => {
  try {

    
    const { token } = req.headers;
    const { authkey } = JSON.parse(token);
    const tokenvalid =  jwt.verify(authkey, process.env.privatekey);
    // console.log(tokenvalid)
    
    if (tokenvalid.id) {
      //CHEKING TOKEN IS EXISTED OR NOT


      const token_e=
      await userModel.findOne({
        
        id: tokenvalid.id,
        authkey
      });
      // console.log('token-e',token_e)
      const existtoken = await userModel.findOne({
        
        id: tokenvalid.id,
        authkey
      });
      // console.log('token',existtoken);
      if (existtoken) {
        return res
          .status(200)
          .send({ status: 1, message: "authenticated success" });
      } else {
        return res
          .status(200)
          .send({ status: 0, message: "authenticated failed" });
      }
    } else {
      return res
        .status(400)
        .send({ status: 0, message: "authenticated failed" });
    }
  } catch (err) {
    return res
      .status(400)
      .send({ status: 0, message: "authentication failed+something" });
  }
});

//  MIDDLEWARE
async function authentication(req, res, next) {
  try {
    const { token } = req.headers;
    // console.log(token)

    const { authkey } = JSON.parse(token);
    

    const tokenvalid = await jwt.verify(authkey, process.env.privatekey);
    // console.log(tokenvalid.id)
    if (tokenvalid.id) {
      //CHEKING TOKEN IS EXISTED OR NOT

      const existtoken = await userModel.findOne({
        id: tokenvalid.id,
        authkey: authkey,
      });
      console.log('existtoken',existtoken.id)
      if (existtoken) {
        req.body.user_id = existtoken.id;
        req.body.name = req.body.myName;

        next();
        //    return res.status(200).send({status:1,message:'authenticated success'})
      } else {
        return res
          .status(200)
          .send({ status: 0, message: "authenticated failed " });
      }
    } else {
      return res
        .status(400)
        .send({ status: 0, message: "authenticated failed " });
    }
  } catch (err) {
    return res
      .status(400)
      .send({ status: 0, message: "authentication failed " });
  }
}
//UPDATING PROFILE

router.post("/api/updateprofile", authentication, async(req, res) => {
  console.log('im in')
  console.log('userid with something',req.files,req.body.user_id)

  try {
    const { name, user_id } = req.body;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send({ status: 0, message: "no files there" });
    }
    let { sampleFile } = req.files;
    
    const uid = new Date().toDateString() + new Date().getTime();

    if (sampleFile.length != undefined)
      return res.status(400).send({ status: 0, error: "select single image" });
    if (
      !(sampleFile.mimetype === "image/png") &&
      !(sampleFile.mimetype === "image/jpg") &&
      !(sampleFile.mimetype === "image/jpeg") &&
      !(sampleFile.mimetype === "image/bmp") &&
      !(sampleFile.mimetype === "image/webp")
    ) {
      return res.status(400).send({ status: 0, error: "invalid file format" });
    }

    if (!name)
      return res.status(400).send({ status: 0, message: "Enter your name" });
    if (!name.lenth > 3) {
      return res
        .status(400)
        .send({ status: 0, message: "Name should be 3 characters" });
    }

   let upload_path = "/uploads/" + "profile_" + uid.replaceAll(/\s/g, "");

    console.log(upload_path);

    //UPLOADING

    sampleFile.mv("." + upload_path+
  path.extname(sampleFile.name), async function (err) {
    if (!err) {    
        
        // converting into webp


        imagemin(["./"+upload_path+
        path.extname(sampleFile.name)], {
            destination: "./uploads/webp/",
            plugins: [
              imageminWebp({
                  quality: 80
                //   ,
                //   resize: {
                //     width: 1000,
                //     height: 0
                //   }
              }),
            ],
          }).then(() => {
            console.log("Images Converted Successfully!!!");
          }).catch((err)=>console.log(err));


          //UPDATE THE DATA BASE
          const profileimg="/uploads/profile_" + uid.replaceAll(/\s/g, "")+".webp"
          console.log('userid',user_id)
          const update_profile=await userModel.findByIdAndUpdate(user_id,{profileimg,name})
          console.log(update_profile)
          if(update_profile)
          {
            const userDetails = await userModel.findById(user_id)
            const { number, otp, ...others } = userDetails._doc;          
      return res.send({status:1,
        message: "file send ok",
        data:others
      });}
      else{
        return res.status(400).send({status:0,messge:'something went wrong' });
      }
    } else {
      //   converting image into webp

     
      
      return res.staus(400).send({ message: err });
    }
  })





  } catch (err) {
    return res.status(400).send({ status: 0, error: "error occured" });
  }
});

//IMAGE UPLOAD


router.get('/api/contacts',authentication,async(req,res)=>
{
  try{
    const { user_id } = req.body;
    const contacts=await userModel.find({_id:{$ne:user_id}},{name:1,number:1,profileimg:1})
    const friends=await userModel.findOne({_id:user_id},{friends:1})
    
    return res.status(200).send({status:1,data:contacts,friends:friends.friends})

  }
  catch(err)
  {

  }
})


//SENDING REQUEST
router.get('/api/:sid/send',authentication,async(req,res)=>
{
  try{
    // console.log(req.params,req.body.user_id)
    const {user_id}=req.body;
    const {sid}=req.params;
    // res.status(200).send({status:1,message:req.params})


    // getting id of number from all users
    const exist_number=await userModel.findOne({number:sid}).select({id:1})
    if(!exist_number)return res.status(200).send({status:0,message:'number not registered'})
    if(user_id==exist_number.id)
    {
      return res.status(200).send({status:0,message:"you cannot add request to your number"})
    }

    // checking user is already existing in friend list
    console.log(user_id,exist_number._id)
    const existfriend=await userModel.findOne({$and:[{_id:{$eq:user_id}},{friends:{$in:[exist_number.id]}}]})
    // console.log(existfriend)
    // console.log('line no 365',exist_number.id,existfriend)
    if(existfriend) return res.status(200).send({status:0,message:'Already in your friendlist'})
    
    // cheking in my pending list
    const pending_list=await userModel.findOne({$and:[{id:{$eq:user_id}},{pending:{$in:[exist_number.id]}}]})
    if(pending_list) return res.status(200).send({status:0,message:'already you send request'})

    // adding into my pending list
    const pending=await userModel.findByIdAndUpdate(user_id,{$push:{pending:exist_number.id}})
    // console.log(pending)

    //add to request id list

    const request=await userModel.findByIdAndUpdate(exist_number.id,{$push:{requests:user_id}})
    // console.log(requests)

      res.status(200).send({status:1,message:'send request successfully',id:exist_number.id})
  }
  catch(err)
  {
    return res.status(500).send({status:1,message:"error occured"})
  }
})


//ACCEPTING REQUEST
router.get('/api/:sid/accept',authentication,async(req,res)=>
{
  try{
    const{user_id}=req.body;
    const{sid}=req.params;

    // console.log(req.params,req.body.user_id)
    // res.status(200).send({status:1,message:req.params})


    // check the request in my pendinglist
    const check_pending=await userModel.findOne({$and:[{id:{$eq:sid}},{pending:{$in:[user_id]}}]})
    console.log('chek pending',check_pending)
    
    if(check_pending){
      const remove_pending=await userModel.findByIdAndUpdate(sid,{$pull:{pending:user_id}})
      if(remove_pending)
      {
        console.log("remove_pending",remove_pending)
        const check_request=await userModel.findOne({$and:[{id:{$eq:user_id}},{requests:{$in:[sid]}}]})
    console.log('chek requests',check_request)
    if(check_request)
    {
      const remove_request=await userModel.findByIdAndUpdate(user_id,{$pull:{requests:sid}})
    if(remove_request)
    { console.log(remove_request);
      const add_friend=await userModel.findByIdAndUpdate(user_id,{$push:{friends:sid}});
      
      const add_friend_user_id=await userModel.findByIdAndUpdate(sid,{$push:{friends:user_id}})
      const newchat=new chatModel({
        sender:user_id,
        reciever:sid,
      
      })
      const chat1=await newchat.save();
      const newchat2=new chatModel({
        sender:sid,
        reciever:user_id,
      
      })
      const chat2=await newchat2.save();
    }
    }


        
      }
    }


     
    // }
    // //check the number in request of other user
    
    
    // }
    // console.log('check request',check_request)
    
    return res.status(200).send({status:1,message:'added to your friendlist'})

  }
  catch(err)
  {
    return res.status(500).send({status:1,message:"error occured"})
  }
})
//REJECT THE REQUEST

router.get('/api/:sid/cancel',authentication,async(req,res)=>
{
  try{
    const{user_id}=req.body;
    const{sid}=req.params;

    // console.log(req.params,req.body.user_id)
    // res.status(200).send({status:1,message:req.params})


    // check the request in my pendinglist
    const check_pending=await userModel.findOne({$and:[{id:{$eq:sid}},{pending:{$in:[user_id]}}]})
    console.log('chek pending',check_pending)
    
    if(check_pending){
      const remove_pending=await userModel.findByIdAndUpdate(sid,{$pull:{pending:user_id}})
      if(remove_pending)
      {
        console.log("remove_pending",remove_pending)
        const check_request=await userModel.findOne({$and:[{id:{$eq:user_id}},{requests:{$in:[sid]}}]})
    console.log('chek requests',check_request)
    if(check_request)
    {
      const remove_request=await userModel.findByIdAndUpdate(user_id,{$pull:{requests:sid}})
    if(remove_request)
    { console.log(remove_request);
      
    }
    }


        
      }
    }


     
    // }
    // //check the number in request of other user
    
    
    // }
    // console.log('check request',check_request)
    
    return res.status(200).send({status:1,message:'canceled your request'})

  }
  catch(err)
  {
    return res.status(500).send({status:1,message:"error occured"})
  }
})

//getting notifictions 
router.get('/api/notifications',authentication,async(req,res)=>
{
  try{
    const {user_id}=req.body;
    const notifications=await userModel.findById(user_id).select({requests:1})
    return res.status(200).send({status:1,message:"requests",data:notifications.requests})
    console.log(notifications)

  }
  catch(err)
  {
    return res.status(400).send({status:0,message:'error occured'})
  }
})

//GETTING CHAT history

router.get('/api/:sid/chat',authentication,async(req,res)=>
{
  try{
    const {user_id}=req.body;
    const {sid}=req.params;
    // console.log(user_id,sid)
    const get_chat=await chatModel.findOne({$and:[{sender:{$eq:user_id}},{reciever:{$eq:sid}}]})
    // console.log(get_chat)
    if(!get_chat) return res.status(400).send({status:0,message:'user not found'})

    return res.status(200).send({status:1,message:'ok',messages:get_chat.messages})

  }
  catch(err)
  {
    return res.status(500).status({
      status:0,message:"something wrong"
    })
  }
})

//SENDING MESSAGE TO FRIEND
router.put('/api/:sid/sendmessage',authentication,async(req,res)=>
{
  try{
    // time conversation

     const mtime=await formatAMPM(new Date);
     
    
    const {user_id,msg}=req.body;
    // console.log(msg);
    const content= msg;
    const {sid}=req.params;
    // console.log(user_id,sid)
    const get_chat=await chatModel.findOne({$and:[{sender:{$eq:user_id}},{reciever:{$eq:sid}}]})
    // console.log(get_chat)
    if(!get_chat) return res.status(400).send({status:0,message:'user not found'})
    const messages={left:0,right:1,content,mtime}
    const messages_user={left:1,right:0,content,mtime}
    const sendmessage=await chatModel.findOneAndUpdate({$and:[{sender:{$eq:user_id}},{reciever:{$eq:sid}}]},{$push:{messages}})
    const sendmessage_user=await chatModel.findOneAndUpdate({$and:[{sender:{$eq:sid}},{reciever:{$eq:user_id}}]},{$push:{messages:messages_user}})


    // getting chat again
    const get_chat2=await chatModel.findOne({$and:[{sender:{$eq:user_id}},{reciever:{$eq:sid}}]})
    res.status(200).send({status:1,message:'send  success',messages:get_chat2.messages})

  }
  catch(err)
  {
    return res.status(500).status({
      status:0,message:"something wrong"
    })
  }
})

//TIME CONVERSION

 function formatAMPM(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}



export default router;
