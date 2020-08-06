const Koa=require('koa');
const koaStatic=require('koa-static');
const path=require('path');
const cors = require('kcors');
const koaBody = require('koa-body');
const koaJson=require('koa-json');
const fs=require('fs');
const app=new Koa();
const uploadRouter=require('./routes/handleUpload');
const mergeRouter=require('./routes/handleMerge');
const againRouter=require('./routes/handleAgain');
//允许跨域,并且允许附带cookie
app.use(cors({credentials: true}))      
//配置静态目录
app.use(koaStatic(path.resolve(__dirname,'../public')));

// app.use(koaJson());
//文件上传配置
app.use(koaBody({
  multipart:true, // 支持文件上传
  formidable:{
    //  uploadDir:path.join(__dirname,'../target','..'),  // 设置文件上传目录,要确保这个文件夹已经存在,否则会报错
      keepExtensions: true,    // 保持文件的后缀
      onError:(err)=>{
        console.log('err:',err)
      },
      //maxFieldsSize:2 * 1024 * 1024, // 所有的字段大小(不包括文件,默认是20M)
      //maxFileSize: 200*1024*1024,    //上传的文件大小限制,默认是200M
      onFileBegin:(name,file) => { // 文件上传前的设置
          //检查上传的目录是否存在
          let upFolder = path.resolve(__dirname,'./target')   //放置于public目录(也就是静态资源目录,才好前端页面直接引用)
          let flag = fs.existsSync(upFolder);
          if(!flag) {   //如果目录不存在,先创建
              fs.mkdirSync(upFolder)
          };

      },
  }
}))
//配置路由
app.use(uploadRouter.routes(),uploadRouter.allowedMethods());   /*启动路由*/
app.use(mergeRouter.routes(),mergeRouter.allowedMethods());
app.use(againRouter.routes(),againRouter.allowedMethods());
// app.use(async (ctx)=>{
//   if(ctx.request.path=='/api/handleMerge'){
//     // ctx.response.message='bulala';
//     console.log(ctx.request,ctx.request.body,1) 
//     ctx.response.status=200;
    
//   }
// })


app.listen('3001',()=>{
  console.log('后台请求启动了');
})

module.exports=app;