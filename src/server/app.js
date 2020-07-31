const Koa=require('koa');
const koaStatic=require('koa-static');
const path=require('path');
const app=new Koa();
const uploadRouter=require('./routes/handleUpload');
//配置静态目录
app.use(koaStatic(path.resolve(__dirname,'./static')));
//启动配置路由
app.use(uploadRouter.routes());   /*启动路由*/
app.use(uploadRouter.allowedMethods());

app.listen('3000',()=>{
  console.log('后台请求启动了');
})

module.exports=app;