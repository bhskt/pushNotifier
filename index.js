var https=require("https"),
	http=require("http"),
	querystring=require("querystring"),
	parse=require("url").parse;
if(!process.argv[2] || !process.argv[3]){
	console.log("Syntax : node[js] index.js <Port> <GitHub OAuth Token> OR node[js] index.js <Port> <User-ID> <Password>");
	process.exit(1);
}
if(process.argv[4]) process.argv[3]+=":"+process.argv[4];
https.get({host:"api.github.com",path:"/user",headers:{"user-agent":"bot"},auth:process.argv[3]},function(res){
	var data="";
	res.setEncoding("ascii");
	res.on("readable",function(){
		data+=res.read();
	}).on("end",function(){
		data=JSON.parse(data);
		if(data.message){
			console.log("Login Failed : "+data.message);
			process.exit(1);
		}
		console.log("Logged In : "+data.name+" ("+data.login+")");
		data.repos_url=parse(data.repos_url);
		https.get({host:data.repos_url.host,path:data.repos_url.path,headers:{"user-agent":"bot"}},function(res){
			res.setEncoding("ascii");
			var data="";
			res.on("readable",function(){
				data+=res.read();
			}).on("end",function(){
				http.get("http://api.ipify.org?format=json",function(res){
					var ip="";
					res.on("readable",function(){
						ip+=res.read();
					}).on("end",function(){
						ip=JSON.parse(ip).ip;
						console.log("Callback URL : http://"+ip+":"+process.argv[2]);
						JSON.parse(data).forEach(function(repo){
							console.log("Found : "+repo.name+" ("+repo.html_url+")")
							var data=querystring.stringify({
									"hub.mode":"subscribe",
									"hub.topic":repo.html_url+"/events/push",
									"hub.callback":"http://"+ip+":"+process.argv[2]
								}),
								req=https.request({host:"api.github.com",method:"POST",path:"/hub",headers:{"user-agent":"bot"},auth:process.argv[3]},function(res){
									var data="";
									res.setEncoding("ascii");
									res.on("readable",function(){
										data+=res.read();
									}).on("end",function(){
										if(data.trim()=="")	console.log("Subscribed : "+repo.name+" ("+repo.html_url+")");
									});
								}.bind(repo));
							req.write(data);
							req.end();
						});
					});
				});
			});
		});
	});
});
http.createServer(function(req,res){
	req.setEncoding("ascii");
	var data="";
	req.on("readable",function(){
		data+=req.read();
	}).on("end",function(){
		res.end();
		data=JSON.parse(querystring.parse(data).payload);
		console.log("Triggered : "+data.commits[0].url);
	});
}).listen(process.argv[2]);
