"use strict";var sjcl={cipher:{},hash:{},keyexchange:{},mode:{},misc:{},codec:{},exception:{corrupt:function(a){this.toString=function(){return"CORRUPT: "+this.message};this.message=a},invalid:function(a){this.toString=function(){return"INVALID: "+this.message};this.message=a},bug:function(a){this.toString=function(){return"BUG: "+this.message};this.message=a},notReady:function(a){this.toString=function(){return"NOT READY: "+this.message};this.message=a}}};
"undefined"!==typeof module&&module.exports&&(module.exports=sjcl);"function"===typeof define&&define([],function(){return sjcl});
sjcl.cipher.aes=function(a){this.D[0][0][0]||this.X();var b,c,d,e,f=this.D[0][4],g=this.D[1];b=a.length;var h=1;if(4!==b&&6!==b&&8!==b)throw new sjcl.exception.invalid("invalid aes key size");this.g=[d=a.slice(0),e=[]];for(a=b;a<4*b+28;a++){c=d[a-1];if(0===a%b||8===b&&4===a%b)c=f[c>>>24]<<24^f[c>>16&255]<<16^f[c>>8&255]<<8^f[c&255],0===a%b&&(c=c<<8^c>>>24^h<<24,h=h<<1^283*(h>>7));d[a]=d[a-b]^c}for(b=0;a;b++,a--)c=d[b&3?a:a-4],e[b]=4>=a||4>b?c:g[0][f[c>>>24]]^g[1][f[c>>16&255]]^g[2][f[c>>8&255]]^g[3][f[c&
255]]};
sjcl.cipher.aes.prototype={encrypt:function(a){return t(this,a,0)},decrypt:function(a){return t(this,a,1)},D:[[[],[],[],[],[]],[[],[],[],[],[]]],X:function(){var a=this.D[0],b=this.D[1],c=a[4],d=b[4],e,f,g,h=[],k=[],l,n,m,p;for(e=0;0x100>e;e++)k[(h[e]=e<<1^283*(e>>7))^e]=e;for(f=g=0;!c[f];f^=l||1,g=k[g]||1)for(m=g^g<<1^g<<2^g<<3^g<<4,m=m>>8^m&255^99,c[f]=m,d[m]=f,n=h[e=h[l=h[f]]],p=0x1010101*n^0x10001*e^0x101*l^0x1010100*f,n=0x101*h[m]^0x1010100*m,e=0;4>e;e++)a[e][f]=n=n<<24^n>>>8,b[e][m]=p=p<<24^p>>>8;for(e=
0;5>e;e++)a[e]=a[e].slice(0),b[e]=b[e].slice(0)}};
function t(a,b,c){if(4!==b.length)throw new sjcl.exception.invalid("invalid aes block size");var d=a.g[c],e=b[0]^d[0],f=b[c?3:1]^d[1],g=b[2]^d[2];b=b[c?1:3]^d[3];var h,k,l,n=d.length/4-2,m,p=4,r=[0,0,0,0];h=a.D[c];a=h[0];var q=h[1],w=h[2],x=h[3],y=h[4];for(m=0;m<n;m++)h=a[e>>>24]^q[f>>16&255]^w[g>>8&255]^x[b&255]^d[p],k=a[f>>>24]^q[g>>16&255]^w[b>>8&255]^x[e&255]^d[p+1],l=a[g>>>24]^q[b>>16&255]^w[e>>8&255]^x[f&255]^d[p+2],b=a[b>>>24]^q[e>>16&255]^w[f>>8&255]^x[g&255]^d[p+3],p+=4,e=h,f=k,g=l;for(m=
0;4>m;m++)r[c?3&-m:m]=y[e>>>24]<<24^y[f>>16&255]<<16^y[g>>8&255]<<8^y[b&255]^d[p++],h=e,e=f,f=g,g=b,b=h;return r}
sjcl.bitArray={bitSlice:function(a,b,c){a=sjcl.bitArray.ja(a.slice(b/32),32-(b&31)).slice(1);return void 0===c?a:sjcl.bitArray.clamp(a,c-b)},extract:function(a,b,c){var d=Math.floor(-b-c&31);return((b+c-1^b)&-32?a[b/32|0]<<32-d^a[b/32+1|0]>>>d:a[b/32|0]>>>d)&(1<<c)-1},concat:function(a,b){if(0===a.length||0===b.length)return a.concat(b);var c=a[a.length-1],d=sjcl.bitArray.getPartial(c);return 32===d?a.concat(b):sjcl.bitArray.ja(b,d,c|0,a.slice(0,a.length-1))},bitLength:function(a){var b=a.length;
return 0===b?0:32*(b-1)+sjcl.bitArray.getPartial(a[b-1])},clamp:function(a,b){if(32*a.length<b)return a;a=a.slice(0,Math.ceil(b/32));var c=a.length;b=b&31;0<c&&b&&(a[c-1]=sjcl.bitArray.partial(b,a[c-1]&2147483648>>b-1,1));return a},partial:function(a,b,c){return 32===a?b:(c?b|0:b<<32-a)+0x10000000000*a},getPartial:function(a){return Math.round(a/0x10000000000)||32},equal:function(a,b){if(sjcl.bitArray.bitLength(a)!==sjcl.bitArray.bitLength(b))return!1;var c=0,d;for(d=0;d<a.length;d++)c|=a[d]^b[d];
return 0===c},ja:function(a,b,c,d){var e;e=0;for(void 0===d&&(d=[]);32<=b;b-=32)d.push(c),c=0;if(0===b)return d.concat(a);for(e=0;e<a.length;e++)d.push(c|a[e]>>>b),c=a[e]<<32-b;e=a.length?a[a.length-1]:0;a=sjcl.bitArray.getPartial(e);d.push(sjcl.bitArray.partial(b+a&31,32<b+a?c:d.pop(),1));return d},s:function(a,b){return[a[0]^b[0],a[1]^b[1],a[2]^b[2],a[3]^b[3]]},byteswapM:function(a){var b,c;for(b=0;b<a.length;++b)c=a[b],a[b]=c>>>24|c>>>8&0xff00|(c&0xff00)<<8|c<<24;return a}};
sjcl.codec.utf8String={fromBits:function(a){var b="",c=sjcl.bitArray.bitLength(a),d,e;for(d=0;d<c/8;d++)0===(d&3)&&(e=a[d/4]),b+=String.fromCharCode(e>>>24),e<<=8;return decodeURIComponent(escape(b))},toBits:function(a){a=unescape(encodeURIComponent(a));var b=[],c,d=0;for(c=0;c<a.length;c++)d=d<<8|a.charCodeAt(c),3===(c&3)&&(b.push(d),d=0);c&3&&b.push(sjcl.bitArray.partial(8*(c&3),d));return b}};
sjcl.codec.hex={fromBits:function(a){var b="",c;for(c=0;c<a.length;c++)b+=((a[c]|0)+0xf00000000000).toString(16).substr(4);return b.substr(0,sjcl.bitArray.bitLength(a)/4)},toBits:function(a){var b,c=[],d;a=a.replace(/\s|0x/g,"");d=a.length;a=a+"00000000";for(b=0;b<a.length;b+=8)c.push(parseInt(a.substr(b,8),16)^0);return sjcl.bitArray.clamp(c,4*d)}};
sjcl.codec.base32={J:"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",fa:"0123456789ABCDEFGHIJKLMNOPQRSTUV",BITS:32,BASE:5,REMAINING:27,fromBits:function(a,b,c){var d=sjcl.codec.base32.BASE,e=sjcl.codec.base32.REMAINING,f="",g=0,h=sjcl.codec.base32.J,k=0,l=sjcl.bitArray.bitLength(a);c&&(h=sjcl.codec.base32.fa);for(c=0;f.length*d<l;)f+=h.charAt((k^a[c]>>>g)>>>e),g<d?(k=a[c]<<d-g,g+=e,c++):(k<<=d,g-=d);for(;f.length&7&&!b;)f+="=";return f},toBits:function(a,b){a=a.replace(/\s|=/g,"").toUpperCase();var c=sjcl.codec.base32.BITS,
d=sjcl.codec.base32.BASE,e=sjcl.codec.base32.REMAINING,f=[],g,h=0,k=sjcl.codec.base32.J,l=0,n,m="base32";b&&(k=sjcl.codec.base32.fa,m="base32hex");for(g=0;g<a.length;g++){n=k.indexOf(a.charAt(g));if(0>n){if(!b)try{return sjcl.codec.base32hex.toBits(a)}catch(p){}throw new sjcl.exception.invalid("this isn't "+m+"!");}h>e?(h-=e,f.push(l^n>>>h),l=n<<c-h):(h+=d,l^=n<<c-h)}h&56&&f.push(sjcl.bitArray.partial(h&56,l,1));return f}};
sjcl.codec.base32hex={fromBits:function(a,b){return sjcl.codec.base32.fromBits(a,b,1)},toBits:function(a){return sjcl.codec.base32.toBits(a,1)}};
sjcl.codec.base64={J:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",fromBits:function(a,b,c){var d="",e=0,f=sjcl.codec.base64.J,g=0,h=sjcl.bitArray.bitLength(a);c&&(f=f.substr(0,62)+"-_");for(c=0;6*d.length<h;)d+=f.charAt((g^a[c]>>>e)>>>26),6>e?(g=a[c]<<6-e,e+=26,c++):(g<<=6,e-=6);for(;d.length&3&&!b;)d+="=";return d},toBits:function(a,b){a=a.replace(/\s|=/g,"");var c=[],d,e=0,f=sjcl.codec.base64.J,g=0,h;b&&(f=f.substr(0,62)+"-_");for(d=0;d<a.length;d++){h=f.indexOf(a.charAt(d));
if(0>h)throw new sjcl.exception.invalid("this isn't base64!");26<e?(e-=26,c.push(g^h>>>e),g=h<<32-e):(e+=6,g^=h<<32-e)}e&56&&c.push(sjcl.bitArray.partial(e&56,g,1));return c}};sjcl.codec.base64url={fromBits:function(a){return sjcl.codec.base64.fromBits(a,1,1)},toBits:function(a){return sjcl.codec.base64.toBits(a,1)}};
sjcl.codec.bytes={fromBits:function(a){var b=[],c=sjcl.bitArray.bitLength(a),d,e;for(d=0;d<c/8;d++)0===(d&3)&&(e=a[d/4]),b.push(e>>>24),e<<=8;return b},toBits:function(a){var b=[],c,d=0;for(c=0;c<a.length;c++)d=d<<8|a[c],3===(c&3)&&(b.push(d),d=0);c&3&&b.push(sjcl.bitArray.partial(8*(c&3),d));return b}};sjcl.hash.sha256=function(a){this.g[0]||this.X();a?(this.N=a.N.slice(0),this.I=a.I.slice(0),this.A=a.A):this.reset()};sjcl.hash.sha256.hash=function(a){return(new sjcl.hash.sha256).update(a).finalize()};
sjcl.hash.sha256.prototype={blockSize:512,reset:function(){this.N=this.ga.slice(0);this.I=[];this.A=0;return this},update:function(a){"string"===typeof a&&(a=sjcl.codec.utf8String.toBits(a));var b,c=this.I=sjcl.bitArray.concat(this.I,a);b=this.A;a=this.A=b+sjcl.bitArray.bitLength(a);if("undefined"!==typeof Uint32Array){var d=new Uint32Array(c),e=0;for(b=512+b&-512;b<=a;b+=512)u(this,d.subarray(16*e,16*(e+1))),e+=1;c.splice(0,16*e)}else for(b=512+b&-512;b<=a;b+=512)u(this,c.splice(0,16));return this},
finalize:function(){var a,b=this.I,c=this.N,b=sjcl.bitArray.concat(b,[sjcl.bitArray.partial(1,1)]);for(a=b.length+2;a&15;a++)b.push(0);b.push(Math.floor(this.A/0x100000000));for(b.push(this.A|0);b.length;)u(this,b.splice(0,16));this.reset();return c},ga:[],g:[],X:function(){function a(a){return 0x100000000*(a-Math.floor(a))|0}var b=0,c=2,d;a:for(;64>b;c++){for(d=2;d*d<=c;d++)if(0===c%d)continue a;8>b&&(this.ga[b]=a(Math.pow(c,.5)));this.g[b]=a(Math.pow(c,1/3));b++}}};
function u(a,b){var c,d,e,f=a.N,g=a.g,h=f[0],k=f[1],l=f[2],n=f[3],m=f[4],p=f[5],r=f[6],q=f[7];for(c=0;64>c;c++)16>c?d=b[c]:(d=b[c+1&15],e=b[c+14&15],d=b[c&15]=(d>>>7^d>>>18^d>>>3^d<<25^d<<14)+(e>>>17^e>>>19^e>>>10^e<<15^e<<13)+b[c&15]+b[c+9&15]|0),d=d+q+(m>>>6^m>>>11^m>>>25^m<<26^m<<21^m<<7)+(r^m&(p^r))+g[c],q=r,r=p,p=m,m=n+d|0,n=l,l=k,k=h,h=d+(k&l^n&(k^l))+(k>>>2^k>>>13^k>>>22^k<<30^k<<19^k<<10)|0;f[0]=f[0]+h|0;f[1]=f[1]+k|0;f[2]=f[2]+l|0;f[3]=f[3]+n|0;f[4]=f[4]+m|0;f[5]=f[5]+p|0;f[6]=f[6]+r|0;f[7]=
f[7]+q|0}
sjcl.mode.ccm={name:"ccm",O:[],listenProgress:function(a){sjcl.mode.ccm.O.push(a)},unListenProgress:function(a){a=sjcl.mode.ccm.O.indexOf(a);-1<a&&sjcl.mode.ccm.O.splice(a,1)},qa:function(a){var b=sjcl.mode.ccm.O.slice(),c;for(c=0;c<b.length;c+=1)b[c](a)},encrypt:function(a,b,c,d,e){var f,g=b.slice(0),h=sjcl.bitArray,k=h.bitLength(c)/8,l=h.bitLength(g)/8;e=e||64;d=d||[];if(7>k)throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");for(f=2;4>f&&l>>>8*f;f++);f<15-k&&(f=15-k);c=h.clamp(c,
8*(15-f));b=sjcl.mode.ccm.da(a,b,c,d,e,f);g=sjcl.mode.ccm.K(a,g,c,b,e,f);return h.concat(g.data,g.tag)},decrypt:function(a,b,c,d,e){e=e||64;d=d||[];var f=sjcl.bitArray,g=f.bitLength(c)/8,h=f.bitLength(b),k=f.clamp(b,h-e),l=f.bitSlice(b,h-e),h=(h-e)/8;if(7>g)throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");for(b=2;4>b&&h>>>8*b;b++);b<15-g&&(b=15-g);c=f.clamp(c,8*(15-b));k=sjcl.mode.ccm.K(a,k,c,l,e,b);a=sjcl.mode.ccm.da(a,k.data,c,d,e,b);if(!f.equal(k.tag,a))throw new sjcl.exception.corrupt("ccm: tag doesn't match");
return k.data},ya:function(a,b,c,d,e,f){var g=[],h=sjcl.bitArray,k=h.s;d=[h.partial(8,(b.length?64:0)|d-2<<2|f-1)];d=h.concat(d,c);d[3]|=e;d=a.encrypt(d);if(b.length)for(c=h.bitLength(b)/8,65279>=c?g=[h.partial(16,c)]:0xffffffff>=c&&(g=h.concat([h.partial(16,65534)],[c])),g=h.concat(g,b),b=0;b<g.length;b+=4)d=a.encrypt(k(d,g.slice(b,b+4).concat([0,0,0])));return d},da:function(a,b,c,d,e,f){var g=sjcl.bitArray,h=g.s;e/=8;if(e%2||4>e||16<e)throw new sjcl.exception.invalid("ccm: invalid tag length");
if(0xffffffff<d.length||0xffffffff<b.length)throw new sjcl.exception.bug("ccm: can't deal with 4GiB or more data");c=sjcl.mode.ccm.ya(a,d,c,e,g.bitLength(b)/8,f);for(d=0;d<b.length;d+=4)c=a.encrypt(h(c,b.slice(d,d+4).concat([0,0,0])));return g.clamp(c,8*e)},K:function(a,b,c,d,e,f){var g,h=sjcl.bitArray;g=h.s;var k=b.length,l=h.bitLength(b),n=k/50,m=n;c=h.concat([h.partial(8,f-1)],c).concat([0,0,0]).slice(0,4);d=h.bitSlice(g(d,a.encrypt(c)),0,e);if(!k)return{tag:d,data:[]};for(g=0;g<k;g+=4)g>n&&(sjcl.mode.ccm.qa(g/
k),n+=m),c[3]++,e=a.encrypt(c),b[g]^=e[0],b[g+1]^=e[1],b[g+2]^=e[2],b[g+3]^=e[3];return{tag:d,data:h.clamp(b,l)}}};void 0===sjcl.beware&&(sjcl.beware={});
sjcl.beware["CTR mode is dangerous because it doesn't protect message integrity."]=function(){sjcl.mode.ctr={name:"ctr",encrypt:function(a,b,c,d){return sjcl.mode.ctr.ba(a,b,c,d)},decrypt:function(a,b,c,d){return sjcl.mode.ctr.ba(a,b,c,d)},ba:function(a,b,c,d){var e,f,g;if(d&&d.length)throw new sjcl.exception.invalid("ctr can't authenticate data");if(128!==sjcl.bitArray.bitLength(c))throw new sjcl.exception.invalid("ctr iv must be 128 bits");if(!(d=b.length))return[];c=c.slice(0);e=b.slice(0);b=sjcl.bitArray.bitLength(e);
for(g=0;g<d;g+=4)f=a.encrypt(c),e[g]^=f[0],e[g+1]^=f[1],e[g+2]^=f[2],e[g+3]^=f[3],c[3]++;return sjcl.bitArray.clamp(e,b)}}};
sjcl.mode.ocb2={name:"ocb2",encrypt:function(a,b,c,d,e,f){if(128!==sjcl.bitArray.bitLength(c))throw new sjcl.exception.invalid("ocb iv must be 128 bits");var g,h=sjcl.mode.ocb2.$,k=sjcl.bitArray,l=k.s,n=[0,0,0,0];c=h(a.encrypt(c));var m,p=[];d=d||[];e=e||64;for(g=0;g+4<b.length;g+=4)m=b.slice(g,g+4),n=l(n,m),p=p.concat(l(c,a.encrypt(l(c,m)))),c=h(c);m=b.slice(g);b=k.bitLength(m);g=a.encrypt(l(c,[0,0,0,b]));m=k.clamp(l(m.concat([0,0,0]),g),b);n=l(n,l(m.concat([0,0,0]),g));n=a.encrypt(l(n,l(c,h(c))));
d.length&&(n=l(n,f?d:sjcl.mode.ocb2.pmac(a,d)));return p.concat(k.concat(m,k.clamp(n,e)))},decrypt:function(a,b,c,d,e,f){if(128!==sjcl.bitArray.bitLength(c))throw new sjcl.exception.invalid("ocb iv must be 128 bits");e=e||64;var g=sjcl.mode.ocb2.$,h=sjcl.bitArray,k=h.s,l=[0,0,0,0],n=g(a.encrypt(c)),m,p,r=sjcl.bitArray.bitLength(b)-e,q=[];d=d||[];for(c=0;c+4<r/32;c+=4)m=k(n,a.decrypt(k(n,b.slice(c,c+4)))),l=k(l,m),q=q.concat(m),n=g(n);p=r-32*c;m=a.encrypt(k(n,[0,0,0,p]));m=k(m,h.clamp(b.slice(c),p).concat([0,
0,0]));l=k(l,m);l=a.encrypt(k(l,k(n,g(n))));d.length&&(l=k(l,f?d:sjcl.mode.ocb2.pmac(a,d)));if(!h.equal(h.clamp(l,e),h.bitSlice(b,r)))throw new sjcl.exception.corrupt("ocb: tag doesn't match");return q.concat(h.clamp(m,p))},pmac:function(a,b){var c,d=sjcl.mode.ocb2.$,e=sjcl.bitArray,f=e.s,g=[0,0,0,0],h=a.encrypt([0,0,0,0]),h=f(h,d(d(h)));for(c=0;c+4<b.length;c+=4)h=d(h),g=f(g,a.encrypt(f(h,b.slice(c,c+4))));c=b.slice(c);128>e.bitLength(c)&&(h=f(h,d(h)),c=e.concat(c,[-2147483648,0,0,0]));g=f(g,c);
return a.encrypt(f(d(f(h,d(h))),g))},$:function(a){return[a[0]<<1^a[1]>>>31,a[1]<<1^a[2]>>>31,a[2]<<1^a[3]>>>31,a[3]<<1^135*(a[0]>>>31)]}};
sjcl.mode.gcm={name:"gcm",encrypt:function(a,b,c,d,e){var f=b.slice(0);b=sjcl.bitArray;d=d||[];a=sjcl.mode.gcm.K(!0,a,f,d,c,e||128);return b.concat(a.data,a.tag)},decrypt:function(a,b,c,d,e){var f=b.slice(0),g=sjcl.bitArray,h=g.bitLength(f);e=e||128;d=d||[];e<=h?(b=g.bitSlice(f,h-e),f=g.bitSlice(f,0,h-e)):(b=f,f=[]);a=sjcl.mode.gcm.K(!1,a,f,d,c,e);if(!g.equal(a.tag,b))throw new sjcl.exception.corrupt("gcm: tag doesn't match");return a.data},va:function(a,b){var c,d,e,f,g,h=sjcl.bitArray.s;e=[0,0,
0,0];f=b.slice(0);for(c=0;128>c;c++){(d=0!==(a[Math.floor(c/32)]&1<<31-c%32))&&(e=h(e,f));g=0!==(f[3]&1);for(d=3;0<d;d--)f[d]=f[d]>>>1|(f[d-1]&1)<<31;f[0]>>>=1;g&&(f[0]^=-0x1f000000)}return e},w:function(a,b,c){var d,e=c.length;b=b.slice(0);for(d=0;d<e;d+=4)b[0]^=0xffffffff&c[d],b[1]^=0xffffffff&c[d+1],b[2]^=0xffffffff&c[d+2],b[3]^=0xffffffff&c[d+3],b=sjcl.mode.gcm.va(b,a);return b},K:function(a,b,c,d,e,f){var g,h,k,l,n,m,p,r,q=sjcl.bitArray;m=c.length;p=q.bitLength(c);r=q.bitLength(d);h=q.bitLength(e);
g=b.encrypt([0,0,0,0]);96===h?(e=e.slice(0),e=q.concat(e,[1])):(e=sjcl.mode.gcm.w(g,[0,0,0,0],e),e=sjcl.mode.gcm.w(g,e,[0,0,Math.floor(h/0x100000000),h&0xffffffff]));h=sjcl.mode.gcm.w(g,[0,0,0,0],d);n=e.slice(0);d=h.slice(0);a||(d=sjcl.mode.gcm.w(g,h,c));for(l=0;l<m;l+=4)n[3]++,k=b.encrypt(n),c[l]^=k[0],c[l+1]^=k[1],c[l+2]^=k[2],c[l+3]^=k[3];c=q.clamp(c,p);a&&(d=sjcl.mode.gcm.w(g,h,c));a=[Math.floor(r/0x100000000),r&0xffffffff,Math.floor(p/0x100000000),p&0xffffffff];d=sjcl.mode.gcm.w(g,d,a);k=b.encrypt(e);
d[0]^=k[0];d[1]^=k[1];d[2]^=k[2];d[3]^=k[3];return{tag:q.bitSlice(d,0,f),data:c}}};sjcl.misc.hmac=function(a,b){this.ea=b=b||sjcl.hash.sha256;var c=[[],[]],d,e=b.prototype.blockSize/32;this.H=[new b,new b];a.length>e&&(a=b.hash(a));for(d=0;d<e;d++)c[0][d]=a[d]^909522486,c[1][d]=a[d]^1549556828;this.H[0].update(c[0]);this.H[1].update(c[1]);this.Z=new b(this.H[0])};
sjcl.misc.hmac.prototype.encrypt=sjcl.misc.hmac.prototype.mac=function(a){if(this.la)throw new sjcl.exception.invalid("encrypt on already updated hmac called!");this.update(a);return this.digest(a)};sjcl.misc.hmac.prototype.reset=function(){this.Z=new this.ea(this.H[0]);this.la=!1};sjcl.misc.hmac.prototype.update=function(a){this.la=!0;this.Z.update(a)};sjcl.misc.hmac.prototype.digest=function(){var a=this.Z.finalize(),a=(new this.ea(this.H[1])).update(a).finalize();this.reset();return a};
sjcl.misc.pbkdf2=function(a,b,c,d,e){c=c||1E3;if(0>d||0>c)throw sjcl.exception.invalid("invalid params to pbkdf2");"string"===typeof a&&(a=sjcl.codec.utf8String.toBits(a));"string"===typeof b&&(b=sjcl.codec.utf8String.toBits(b));e=e||sjcl.misc.hmac;a=new e(a);var f,g,h,k,l=[],n=sjcl.bitArray;for(k=1;32*l.length<(d||1);k++){e=f=a.encrypt(n.concat(b,[k]));for(g=1;g<c;g++)for(f=a.encrypt(f),h=0;h<f.length;h++)e[h]^=f[h];l=l.concat(e)}d&&(l=n.clamp(l,d));return l};
sjcl.prng=function(a){this.h=[new sjcl.hash.sha256];this.B=[0];this.Y=0;this.P={};this.W=0;this.ca={};this.ia=this.j=this.C=this.sa=0;this.g=[0,0,0,0,0,0,0,0];this.m=[0,0,0,0];this.U=void 0;this.V=a;this.M=!1;this.T={progress:{},seeded:{}};this.F=this.ra=0;this.R=1;this.S=2;this.na=0x10000;this.aa=[0,48,64,96,128,192,0x100,384,512,768,1024];this.oa=3E4;this.ma=80};
sjcl.prng.prototype={randomWords:function(a,b){var c=[],d;d=this.isReady(b);var e;if(d===this.F)throw new sjcl.exception.notReady("generator isn't seeded");if(d&this.S){d=!(d&this.R);e=[];var f=0,g;this.ia=e[0]=(new Date).valueOf()+this.oa;for(g=0;16>g;g++)e.push(0x100000000*Math.random()|0);for(g=0;g<this.h.length&&(e=e.concat(this.h[g].finalize()),f+=this.B[g],this.B[g]=0,d||!(this.Y&1<<g));g++);this.Y>=1<<this.h.length&&(this.h.push(new sjcl.hash.sha256),this.B.push(0));this.j-=f;f>this.C&&(this.C=
f);this.Y++;this.g=sjcl.hash.sha256.hash(this.g.concat(e));this.U=new sjcl.cipher.aes(this.g);for(d=0;4>d&&(this.m[d]=this.m[d]+1|0,!this.m[d]);d++);}for(d=0;d<a;d+=4)0===(d+1)%this.na&&v(this),e=z(this),c.push(e[0],e[1],e[2],e[3]);v(this);return c.slice(0,a)},setDefaultParanoia:function(a,b){if(0===a&&"Setting paranoia=0 will ruin your security; use it only for testing"!==b)throw"Setting paranoia=0 will ruin your security; use it only for testing";this.V=a},addEntropy:function(a,b,c){c=c||"user";
var d,e,f=(new Date).valueOf(),g=this.P[c],h=this.isReady(),k=0;d=this.ca[c];void 0===d&&(d=this.ca[c]=this.sa++);void 0===g&&(g=this.P[c]=0);this.P[c]=(this.P[c]+1)%this.h.length;switch(typeof a){case "number":void 0===b&&(b=1);this.h[g].update([d,this.W++,1,b,f,1,a|0]);break;case "object":c=Object.prototype.toString.call(a);if("[object Uint32Array]"===c){e=[];for(c=0;c<a.length;c++)e.push(a[c]);a=e}else for("[object Array]"!==c&&(k=1),c=0;c<a.length&&!k;c++)"number"!==typeof a[c]&&(k=1);if(!k){if(void 0===
b)for(c=b=0;c<a.length;c++)for(e=a[c];0<e;)b++,e=e>>>1;this.h[g].update([d,this.W++,2,b,f,a.length].concat(a))}break;case "string":void 0===b&&(b=a.length);this.h[g].update([d,this.W++,3,b,f,a.length]);this.h[g].update(a);break;default:k=1}if(k)throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");this.B[g]+=b;this.j+=b;h===this.F&&(this.isReady()!==this.F&&A("seeded",Math.max(this.C,this.j)),A("progress",this.getProgress()))},isReady:function(a){a=this.aa[void 0!==
a?a:this.V];return this.C&&this.C>=a?this.B[0]>this.ma&&(new Date).valueOf()>this.ia?this.S|this.R:this.R:this.j>=a?this.S|this.F:this.F},getProgress:function(a){a=this.aa[a?a:this.V];return this.C>=a?1:this.j>a?1:this.j/a},startCollectors:function(){if(!this.M){this.c={loadTimeCollector:B(this,this.xa),mouseCollector:B(this,this.za),keyboardCollector:B(this,this.wa),accelerometerCollector:B(this,this.pa),touchCollector:B(this,this.Ba)};if(window.addEventListener)window.addEventListener("load",this.c.loadTimeCollector,
!1),window.addEventListener("mousemove",this.c.mouseCollector,!1),window.addEventListener("keypress",this.c.keyboardCollector,!1),window.addEventListener("devicemotion",this.c.accelerometerCollector,!1),window.addEventListener("touchmove",this.c.touchCollector,!1);else if(document.attachEvent)document.attachEvent("onload",this.c.loadTimeCollector),document.attachEvent("onmousemove",this.c.mouseCollector),document.attachEvent("keypress",this.c.keyboardCollector);else throw new sjcl.exception.bug("can't attach event");
this.M=!0}},stopCollectors:function(){this.M&&(window.removeEventListener?(window.removeEventListener("load",this.c.loadTimeCollector,!1),window.removeEventListener("mousemove",this.c.mouseCollector,!1),window.removeEventListener("keypress",this.c.keyboardCollector,!1),window.removeEventListener("devicemotion",this.c.accelerometerCollector,!1),window.removeEventListener("touchmove",this.c.touchCollector,!1)):document.detachEvent&&(document.detachEvent("onload",this.c.loadTimeCollector),document.detachEvent("onmousemove",
this.c.mouseCollector),document.detachEvent("keypress",this.c.keyboardCollector)),this.M=!1)},addEventListener:function(a,b){this.T[a][this.ra++]=b},removeEventListener:function(a,b){var c,d,e=this.T[a],f=[];for(d in e)e.hasOwnProperty(d)&&e[d]===b&&f.push(d);for(c=0;c<f.length;c++)d=f[c],delete e[d]},wa:function(){C(this,1)},za:function(a){var b,c;try{b=a.x||a.clientX||a.offsetX||0,c=a.y||a.clientY||a.offsetY||0}catch(d){c=b=0}0!=b&&0!=c&&this.addEntropy([b,c],2,"mouse");C(this,0)},Ba:function(a){a=
a.touches[0]||a.changedTouches[0];this.addEntropy([a.pageX||a.clientX,a.pageY||a.clientY],1,"touch");C(this,0)},xa:function(){C(this,2)},pa:function(a){a=a.accelerationIncludingGravity.x||a.accelerationIncludingGravity.y||a.accelerationIncludingGravity.z;if(window.orientation){var b=window.orientation;"number"===typeof b&&this.addEntropy(b,1,"accelerometer")}a&&this.addEntropy(a,2,"accelerometer");C(this,0)}};
function A(a,b){var c,d=sjcl.random.T[a],e=[];for(c in d)d.hasOwnProperty(c)&&e.push(d[c]);for(c=0;c<e.length;c++)e[c](b)}function C(a,b){"undefined"!==typeof window&&window.performance&&"function"===typeof window.performance.now?a.addEntropy(window.performance.now(),b,"loadtime"):a.addEntropy((new Date).valueOf(),b,"loadtime")}function v(a){a.g=z(a).concat(z(a));a.U=new sjcl.cipher.aes(a.g)}function z(a){for(var b=0;4>b&&(a.m[b]=a.m[b]+1|0,!a.m[b]);b++);return a.U.encrypt(a.m)}
function B(a,b){return function(){b.apply(a,arguments)}}sjcl.random=new sjcl.prng(6);
a:try{var D,E,F,G;if(G="undefined"!==typeof module&&module.exports){var H;try{H=require("crypto")}catch(a){H=null}G=E=H}if(G&&E.randomBytes)D=E.randomBytes(128),D=new Uint32Array((new Uint8Array(D)).buffer),sjcl.random.addEntropy(D,1024,"crypto['randomBytes']");else if("undefined"!==typeof window&&"undefined"!==typeof Uint32Array){F=new Uint32Array(32);if(window.crypto&&window.crypto.getRandomValues)window.crypto.getRandomValues(F);else if(window.msCrypto&&window.msCrypto.getRandomValues)window.msCrypto.getRandomValues(F);
else break a;sjcl.random.addEntropy(F,1024,"crypto['getRandomValues']")}}catch(a){"undefined"!==typeof window&&window.console&&(console.log("There was an error collecting entropy from the browser:"),console.log(a))}
sjcl.json={defaults:{v:1,iter:1E3,ks:128,ts:64,mode:"ccm",adata:"",cipher:"aes"},ua:function(a,b,c,d){c=c||{};d=d||{};var e=sjcl.json,f=e.l({iv:sjcl.random.randomWords(4,0)},e.defaults),g;e.l(f,c);c=f.adata;"string"===typeof f.salt&&(f.salt=sjcl.codec.base64.toBits(f.salt));"string"===typeof f.iv&&(f.iv=sjcl.codec.base64.toBits(f.iv));if(!sjcl.mode[f.mode]||!sjcl.cipher[f.cipher]||"string"===typeof a&&100>=f.iter||64!==f.ts&&96!==f.ts&&128!==f.ts||128!==f.ks&&192!==f.ks&&0x100!==f.ks||2>f.iv.length||
4<f.iv.length)throw new sjcl.exception.invalid("json encrypt: invalid parameters");"string"===typeof a?(g=sjcl.misc.cachedPbkdf2(a,f),a=g.key.slice(0,f.ks/32),f.salt=g.salt):sjcl.ecc&&a instanceof sjcl.ecc.elGamal.publicKey&&(g=a.kem(),f.kemtag=g.tag,a=g.key.slice(0,f.ks/32));"string"===typeof b&&(b=sjcl.codec.utf8String.toBits(b));"string"===typeof c&&(f.adata=c=sjcl.codec.utf8String.toBits(c));g=new sjcl.cipher[f.cipher](a);e.l(d,f);d.key=a;f.ct="ccm"===f.mode&&sjcl.arrayBuffer&&sjcl.arrayBuffer.ccm&&
b instanceof ArrayBuffer?sjcl.arrayBuffer.ccm.encrypt(g,b,f.iv,c,f.ts):sjcl.mode[f.mode].encrypt(g,b,f.iv,c,f.ts);return f},encrypt:function(a,b,c,d){var e=sjcl.json,f=e.ua.apply(e,arguments);return e.encode(f)},ta:function(a,b,c,d){c=c||{};d=d||{};var e=sjcl.json;b=e.l(e.l(e.l({},e.defaults),b),c,!0);var f,g;f=b.adata;"string"===typeof b.salt&&(b.salt=sjcl.codec.base64.toBits(b.salt));"string"===typeof b.iv&&(b.iv=sjcl.codec.base64.toBits(b.iv));if(!sjcl.mode[b.mode]||!sjcl.cipher[b.cipher]||"string"===
typeof a&&100>=b.iter||64!==b.ts&&96!==b.ts&&128!==b.ts||128!==b.ks&&192!==b.ks&&0x100!==b.ks||!b.iv||2>b.iv.length||4<b.iv.length)throw new sjcl.exception.invalid("json decrypt: invalid parameters");"string"===typeof a?(g=sjcl.misc.cachedPbkdf2(a,b),a=g.key.slice(0,b.ks/32),b.salt=g.salt):sjcl.ecc&&a instanceof sjcl.ecc.elGamal.secretKey&&(a=a.unkem(sjcl.codec.base64.toBits(b.kemtag)).slice(0,b.ks/32));"string"===typeof f&&(f=sjcl.codec.utf8String.toBits(f));g=new sjcl.cipher[b.cipher](a);f="ccm"===
b.mode&&sjcl.arrayBuffer&&sjcl.arrayBuffer.ccm&&b.ct instanceof ArrayBuffer?sjcl.arrayBuffer.ccm.decrypt(g,b.ct,b.iv,b.tag,f,b.ts):sjcl.mode[b.mode].decrypt(g,b.ct,b.iv,f,b.ts);e.l(d,b);d.key=a;return 1===c.raw?f:sjcl.codec.utf8String.fromBits(f)},decrypt:function(a,b,c,d){var e=sjcl.json;return e.ta(a,e.decode(b),c,d)},encode:function(a){var b,c="{",d="";for(b in a)if(a.hasOwnProperty(b)){if(!b.match(/^[a-z0-9]+$/i))throw new sjcl.exception.invalid("json encode: invalid property name");c+=d+'"'+
b+'":';d=",";switch(typeof a[b]){case "number":case "boolean":c+=a[b];break;case "string":c+='"'+escape(a[b])+'"';break;case "object":c+='"'+sjcl.codec.base64.fromBits(a[b],0)+'"';break;default:throw new sjcl.exception.bug("json encode: unsupported type");}}return c+"}"},decode:function(a){a=a.replace(/\s/g,"");if(!a.match(/^\{.*\}$/))throw new sjcl.exception.invalid("json decode: this isn't json!");a=a.replace(/^\{|\}$/g,"").split(/,/);var b={},c,d;for(c=0;c<a.length;c++){if(!(d=a[c].match(/^\s*(?:(["']?)([a-z][a-z0-9]*)\1)\s*:\s*(?:(-?\d+)|"([a-z0-9+\/%*_.@=\-]*)"|(true|false))$/i)))throw new sjcl.exception.invalid("json decode: this isn't json!");
null!=d[3]?b[d[2]]=parseInt(d[3],10):null!=d[4]?b[d[2]]=d[2].match(/^(ct|adata|salt|iv)$/)?sjcl.codec.base64.toBits(d[4]):unescape(d[4]):null!=d[5]&&(b[d[2]]="true"===d[5])}return b},l:function(a,b,c){void 0===a&&(a={});if(void 0===b)return a;for(var d in b)if(b.hasOwnProperty(d)){if(c&&void 0!==a[d]&&a[d]!==b[d])throw new sjcl.exception.invalid("required parameter overridden");a[d]=b[d]}return a},Da:function(a,b){var c={},d;for(d in a)a.hasOwnProperty(d)&&a[d]!==b[d]&&(c[d]=a[d]);return c},Ca:function(a,
b){var c={},d;for(d=0;d<b.length;d++)void 0!==a[b[d]]&&(c[b[d]]=a[b[d]]);return c}};sjcl.encrypt=sjcl.json.encrypt;sjcl.decrypt=sjcl.json.decrypt;sjcl.misc.Aa={};sjcl.misc.cachedPbkdf2=function(a,b){var c=sjcl.misc.Aa,d;b=b||{};d=b.iter||1E3;c=c[a]=c[a]||{};d=c[d]=c[d]||{firstSalt:b.salt&&b.salt.length?b.salt.slice(0):sjcl.random.randomWords(2,0)};c=void 0===b.salt?d.firstSalt:b.salt;d[c]=d[c]||sjcl.misc.pbkdf2(a,c,b.iter);return{key:d[c].slice(0),salt:c.slice(0)}};sjcl.bn=function(a){this.initWith(a)};
sjcl.bn.prototype={radix:24,maxMul:8,f:sjcl.bn,copy:function(){return new this.f(this)},initWith:function(a){var b=0,c;switch(typeof a){case "object":this.limbs=a.limbs.slice(0);break;case "number":this.limbs=[a];this.normalize();break;case "string":a=a.replace(/^0x/,"");this.limbs=[];c=this.radix/4;for(b=0;b<a.length;b+=c)this.limbs.push(parseInt(a.substring(Math.max(a.length-b-c,0),a.length-b),16));break;default:this.limbs=[0]}return this},equals:function(a){"number"===typeof a&&(a=new this.f(a));
var b=0,c;this.fullReduce();a.fullReduce();for(c=0;c<this.limbs.length||c<a.limbs.length;c++)b|=this.getLimb(c)^a.getLimb(c);return 0===b},getLimb:function(a){return a>=this.limbs.length?0:this.limbs[a]},greaterEquals:function(a){"number"===typeof a&&(a=new this.f(a));var b=0,c=0,d,e,f;for(d=Math.max(this.limbs.length,a.limbs.length)-1;0<=d;d--)e=this.getLimb(d),f=a.getLimb(d),c|=f-e&~b,b|=e-f&~c;return(c|~b)>>>31},toString:function(){this.fullReduce();var a="",b,c,d=this.limbs;for(b=0;b<this.limbs.length;b++){for(c=
d[b].toString(16);b<this.limbs.length-1&&6>c.length;)c="0"+c;a=c+a}return"0x"+a},addM:function(a){"object"!==typeof a&&(a=new this.f(a));var b=this.limbs,c=a.limbs;for(a=b.length;a<c.length;a++)b[a]=0;for(a=0;a<c.length;a++)b[a]+=c[a];return this},doubleM:function(){var a,b=0,c,d=this.radix,e=this.radixMask,f=this.limbs;for(a=0;a<f.length;a++)c=f[a],c=c+c+b,f[a]=c&e,b=c>>d;b&&f.push(b);return this},halveM:function(){var a,b=0,c,d=this.radix,e=this.limbs;for(a=e.length-1;0<=a;a--)c=e[a],e[a]=c+b>>
1,b=(c&1)<<d;e[e.length-1]||e.pop();return this},subM:function(a){"object"!==typeof a&&(a=new this.f(a));var b=this.limbs,c=a.limbs;for(a=b.length;a<c.length;a++)b[a]=0;for(a=0;a<c.length;a++)b[a]-=c[a];return this},mod:function(a){var b=!this.greaterEquals(new sjcl.bn(0));a=(new sjcl.bn(a)).normalize();var c=(new sjcl.bn(this)).normalize(),d=0;for(b&&(c=(new sjcl.bn(0)).subM(c).normalize());c.greaterEquals(a);d++)a.doubleM();for(b&&(c=a.sub(c).normalize());0<d;d--)a.halveM(),c.greaterEquals(a)&&
c.subM(a).normalize();return c.trim()},inverseMod:function(a){var b=new sjcl.bn(1),c=new sjcl.bn(0),d=new sjcl.bn(this),e=new sjcl.bn(a),f,g=1;if(!(a.limbs[0]&1))throw new sjcl.exception.invalid("inverseMod: p must be odd");do for(d.limbs[0]&1&&(d.greaterEquals(e)||(f=d,d=e,e=f,f=b,b=c,c=f),d.subM(e),d.normalize(),b.greaterEquals(c)||b.addM(a),b.subM(c)),d.halveM(),b.limbs[0]&1&&b.addM(a),b.normalize(),b.halveM(),f=g=0;f<d.limbs.length;f++)g|=d.limbs[f];while(g);if(!e.equals(1))throw new sjcl.exception.invalid("inverseMod: p and x must be relatively prime");
return c},add:function(a){return this.copy().addM(a)},sub:function(a){return this.copy().subM(a)},mul:function(a){"number"===typeof a&&(a=new this.f(a));var b,c=this.limbs,d=a.limbs,e=c.length,f=d.length,g=new this.f,h=g.limbs,k,l=this.maxMul;for(b=0;b<this.limbs.length+a.limbs.length+1;b++)h[b]=0;for(b=0;b<e;b++){k=c[b];for(a=0;a<f;a++)h[b+a]+=k*d[a];--l||(l=this.maxMul,g.cnormalize())}return g.cnormalize().reduce()},square:function(){return this.mul(this)},power:function(a){a=(new sjcl.bn(a)).normalize().trim().limbs;
var b,c,d=new this.f(1),e=this;for(b=0;b<a.length;b++)for(c=0;c<this.radix;c++){a[b]&1<<c&&(d=d.mul(e));if(b==a.length-1&&0==a[b]>>c+1)break;e=e.square()}return d},mulmod:function(a,b){return this.mod(b).mul(a.mod(b)).mod(b)},powermod:function(a,b){a=new sjcl.bn(a);b=new sjcl.bn(b);if(1==(b.limbs[0]&1)){var c=this.montpowermod(a,b);if(0!=c)return c}for(var d,e=a.normalize().trim().limbs,f=new this.f(1),g=this,c=0;c<e.length;c++)for(d=0;d<this.radix;d++){e[c]&1<<d&&(f=f.mulmod(g,b));if(c==e.length-
1&&0==e[c]>>d+1)break;g=g.mulmod(g,b)}return f},montpowermod:function(a,b){function c(a,b){var c=b%a.radix;return(a.limbs[Math.floor(b/a.radix)]&1<<c)>>c}function d(a,c){var d,e,f=(1<<l+1)-1;d=a.mul(c);e=d.mul(r);e.limbs=e.limbs.slice(0,k.limbs.length);e.limbs.length==k.limbs.length&&(e.limbs[k.limbs.length-1]&=f);e=e.mul(b);e=d.add(e).normalize().trim();e.limbs=e.limbs.slice(k.limbs.length-1);for(d=0;d<e.limbs.length;d++)0<d&&(e.limbs[d-1]|=(e.limbs[d]&f)<<g-l-1),e.limbs[d]>>=l+1;e.greaterEquals(b)&&
e.subM(b);return e}a=(new sjcl.bn(a)).normalize().trim();b=new sjcl.bn(b);var e,f,g=this.radix,h=new this.f(1);e=this.copy();var k,l,n;n=a.bitLength();k=new sjcl.bn({limbs:b.copy().normalize().trim().limbs.map(function(){return 0})});for(l=this.radix;0<l;l--)if(1==(b.limbs[b.limbs.length-1]>>l&1)){k.limbs[k.limbs.length-1]=1<<l;break}if(0==n)return this;n=18>n?1:48>n?3:144>n?4:768>n?5:6;var m=k.copy(),p=b.copy();f=new sjcl.bn(1);for(var r=new sjcl.bn(0),q=k.copy();q.greaterEquals(1);)q.halveM(),0==
(f.limbs[0]&1)?(f.halveM(),r.halveM()):(f.addM(p),f.halveM(),r.halveM(),r.addM(m));f=f.normalize();r=r.normalize();m.doubleM();p=m.mulmod(m,b);if(!m.mul(f).sub(b.mul(r)).equals(1))return!1;e=d(e,p);h=d(h,p);m={};f=(1<<n-1)-1;m[1]=e.copy();m[2]=d(e,e);for(e=1;e<=f;e++)m[2*e+1]=d(m[2*e-1],m[2]);for(e=a.bitLength()-1;0<=e;)if(0==c(a,e))h=d(h,h),--e;else{for(p=e-n+1;0==c(a,p);)p++;q=0;for(f=p;f<=e;f++)q+=c(a,f)<<f-p,h=d(h,h);h=d(h,m[q]);e=p-1}return d(h,1)},trim:function(){var a=this.limbs,b;do b=a.pop();
while(a.length&&0===b);a.push(b);return this},reduce:function(){return this},fullReduce:function(){return this.normalize()},normalize:function(){var a=0,b,c=this.placeVal,d=this.ipv,e,f=this.limbs,g=f.length,h=this.radixMask;for(b=0;b<g||0!==a&&-1!==a;b++)a=(f[b]||0)+a,e=f[b]=a&h,a=(a-e)*d;-1===a&&(f[b-1]-=c);this.trim();return this},cnormalize:function(){var a=0,b,c=this.ipv,d,e=this.limbs,f=e.length,g=this.radixMask;for(b=0;b<f-1;b++)a=e[b]+a,d=e[b]=a&g,a=(a-d)*c;e[b]+=a;return this},toBits:function(a){this.fullReduce();
a=a||this.exponent||this.bitLength();var b=Math.floor((a-1)/24),c=sjcl.bitArray,d=[c.partial((a+7&-8)%this.radix||this.radix,this.getLimb(b))];for(b--;0<=b;b--)d=c.concat(d,[c.partial(Math.min(this.radix,a),this.getLimb(b))]),a-=this.radix;return d},bitLength:function(){this.fullReduce();for(var a=this.radix*(this.limbs.length-1),b=this.limbs[this.limbs.length-1];b;b>>>=1)a++;return a+7&-8}};
sjcl.bn.fromBits=function(a){var b=new this,c=[],d=sjcl.bitArray,e=this.prototype,f=Math.min(this.bitLength||0x100000000,d.bitLength(a)),g=f%e.radix||e.radix;for(c[0]=d.extract(a,0,g);g<f;g+=e.radix)c.unshift(d.extract(a,g,e.radix));b.limbs=c;return b};sjcl.bn.prototype.ipv=1/(sjcl.bn.prototype.placeVal=Math.pow(2,sjcl.bn.prototype.radix));sjcl.bn.prototype.radixMask=(1<<sjcl.bn.prototype.radix)-1;
sjcl.bn.pseudoMersennePrime=function(a,b){function c(a){this.initWith(a)}var d=c.prototype=new sjcl.bn,e,f;e=d.modOffset=Math.ceil(f=a/d.radix);d.exponent=a;d.offset=[];d.factor=[];d.minOffset=e;d.fullMask=0;d.fullOffset=[];d.fullFactor=[];d.modulus=c.modulus=new sjcl.bn(Math.pow(2,a));d.fullMask=0|-Math.pow(2,a%d.radix);for(e=0;e<b.length;e++)d.offset[e]=Math.floor(b[e][0]/d.radix-f),d.fullOffset[e]=Math.ceil(b[e][0]/d.radix-f),d.factor[e]=b[e][1]*Math.pow(.5,a-b[e][0]+d.offset[e]*d.radix),d.fullFactor[e]=
b[e][1]*Math.pow(.5,a-b[e][0]+d.fullOffset[e]*d.radix),d.modulus.addM(new sjcl.bn(Math.pow(2,b[e][0])*b[e][1])),d.minOffset=Math.min(d.minOffset,-d.offset[e]);d.f=c;d.modulus.cnormalize();d.reduce=function(){var a,b,c,d=this.modOffset,e=this.limbs,f=this.offset,p=this.offset.length,r=this.factor,q;for(a=this.minOffset;e.length>d;){c=e.pop();q=e.length;for(b=0;b<p;b++)e[q+f[b]]-=r[b]*c;a--;a||(e.push(0),this.cnormalize(),a=this.minOffset)}this.cnormalize();return this};d.ka=-1===d.fullMask?d.reduce:
function(){var a=this.limbs,b=a.length-1,c,d;this.reduce();if(b===this.modOffset-1){d=a[b]&this.fullMask;a[b]-=d;for(c=0;c<this.fullOffset.length;c++)a[b+this.fullOffset[c]]-=this.fullFactor[c]*d;this.normalize()}};d.fullReduce=function(){var a,b;this.ka();this.addM(this.modulus);this.addM(this.modulus);this.normalize();this.ka();for(b=this.limbs.length;b<this.modOffset;b++)this.limbs[b]=0;a=this.greaterEquals(this.modulus);for(b=0;b<this.limbs.length;b++)this.limbs[b]-=this.modulus.limbs[b]*a;this.cnormalize();
return this};d.inverse=function(){return this.power(this.modulus.sub(2))};c.fromBits=sjcl.bn.fromBits;return c};var I=sjcl.bn.pseudoMersennePrime;
sjcl.bn.prime={p127:I(127,[[0,-1]]),p25519:I(255,[[0,-19]]),p192k:I(192,[[32,-1],[12,-1],[8,-1],[7,-1],[6,-1],[3,-1],[0,-1]]),p224k:I(224,[[32,-1],[12,-1],[11,-1],[9,-1],[7,-1],[4,-1],[1,-1],[0,-1]]),p256k:I(0x100,[[32,-1],[9,-1],[8,-1],[7,-1],[6,-1],[4,-1],[0,-1]]),p192:I(192,[[0,-1],[64,-1]]),p224:I(224,[[0,1],[96,-1]]),p256:I(0x100,[[0,-1],[96,1],[192,1],[224,-1]]),p384:I(384,[[0,-1],[32,1],[96,-1],[128,-1]]),p521:I(521,[[0,-1]])};
sjcl.bn.random=function(a,b){"object"!==typeof a&&(a=new sjcl.bn(a));for(var c,d,e=a.limbs.length,f=a.limbs[e-1]+1,g=new sjcl.bn;;){do c=sjcl.random.randomWords(e,b),0>c[e-1]&&(c[e-1]+=0x100000000);while(Math.floor(c[e-1]/f)===Math.floor(0x100000000/f));c[e-1]%=f;for(d=0;d<e-1;d++)c[d]&=a.radixMask;g.limbs=c;if(!g.greaterEquals(a))return g}};sjcl.ecc={};
sjcl.ecc.point=function(a,b,c){void 0===b?this.isIdentity=!0:(b instanceof sjcl.bn&&(b=new a.field(b)),c instanceof sjcl.bn&&(c=new a.field(c)),this.x=b,this.y=c,this.isIdentity=!1);this.curve=a};
sjcl.ecc.point.prototype={toJac:function(){return new sjcl.ecc.pointJac(this.curve,this.x,this.y,new this.curve.field(1))},mult:function(a){return this.toJac().mult(a,this).toAffine()},mult2:function(a,b,c){return this.toJac().mult2(a,this,b,c).toAffine()},multiples:function(){var a,b,c;if(void 0===this.ha)for(c=this.toJac().doubl(),a=this.ha=[new sjcl.ecc.point(this.curve),this,c.toAffine()],b=3;16>b;b++)c=c.add(this),a.push(c.toAffine());return this.ha},negate:function(){var a=(new this.curve.field(0)).sub(this.y).normalize().reduce();
return new sjcl.ecc.point(this.curve,this.x,a)},isValid:function(){return this.y.square().equals(this.curve.b.add(this.x.mul(this.curve.a.add(this.x.square()))))},toBits:function(){return sjcl.bitArray.concat(this.x.toBits(),this.y.toBits())}};sjcl.ecc.pointJac=function(a,b,c,d){void 0===b?this.isIdentity=!0:(this.x=b,this.y=c,this.z=d,this.isIdentity=!1);this.curve=a};
sjcl.ecc.pointJac.prototype={add:function(a){var b,c,d,e;if(this.curve!==a.curve)throw"sjcl['ecc']['add'](): Points must be on the same curve to add them!";if(this.isIdentity)return a.toJac();if(a.isIdentity)return this;b=this.z.square();c=a.x.mul(b).subM(this.x);if(c.equals(0))return this.y.equals(a.y.mul(b.mul(this.z)))?this.doubl():new sjcl.ecc.pointJac(this.curve);b=a.y.mul(b.mul(this.z)).subM(this.y);d=c.square();a=b.square();e=c.square().mul(c).addM(this.x.add(this.x).mul(d));a=a.subM(e);b=
this.x.mul(d).subM(a).mul(b);d=this.y.mul(c.square().mul(c));b=b.subM(d);c=this.z.mul(c);return new sjcl.ecc.pointJac(this.curve,a,b,c)},doubl:function(){if(this.isIdentity)return this;var a=this.y.square(),b=a.mul(this.x.mul(4)),c=a.square().mul(8),a=this.z.square(),d=this.curve.a.toString()==(new sjcl.bn(-3)).toString()?this.x.sub(a).mul(3).mul(this.x.add(a)):this.x.square().mul(3).add(a.square().mul(this.curve.a)),a=d.square().subM(b).subM(b),b=b.sub(a).mul(d).subM(c),c=this.y.add(this.y).mul(this.z);
return new sjcl.ecc.pointJac(this.curve,a,b,c)},toAffine:function(){if(this.isIdentity||this.z.equals(0))return new sjcl.ecc.point(this.curve);var a=this.z.inverse(),b=a.square();return new sjcl.ecc.point(this.curve,this.x.mul(b).fullReduce(),this.y.mul(b.mul(a)).fullReduce())},mult:function(a,b){"number"===typeof a?a=[a]:void 0!==a.limbs&&(a=a.normalize().limbs);var c,d,e=(new sjcl.ecc.point(this.curve)).toJac(),f=b.multiples();for(c=a.length-1;0<=c;c--)for(d=sjcl.bn.prototype.radix-4;0<=d;d-=4)e=
e.doubl().doubl().doubl().doubl().add(f[a[c]>>d&15]);return e},mult2:function(a,b,c,d){"number"===typeof a?a=[a]:void 0!==a.limbs&&(a=a.normalize().limbs);"number"===typeof c?c=[c]:void 0!==c.limbs&&(c=c.normalize().limbs);var e,f=(new sjcl.ecc.point(this.curve)).toJac();b=b.multiples();var g=d.multiples(),h,k;for(d=Math.max(a.length,c.length)-1;0<=d;d--)for(h=a[d]|0,k=c[d]|0,e=sjcl.bn.prototype.radix-4;0<=e;e-=4)f=f.doubl().doubl().doubl().doubl().add(b[h>>e&15]).add(g[k>>e&15]);return f},negate:function(){return this.toAffine().negate().toJac()},
isValid:function(){var a=this.z.square(),b=a.square(),a=b.mul(a);return this.y.square().equals(this.curve.b.mul(a).add(this.x.mul(this.curve.a.mul(b).add(this.x.square()))))}};sjcl.ecc.curve=function(a,b,c,d,e,f){this.field=a;this.r=new sjcl.bn(b);this.a=new a(c);this.b=new a(d);this.G=new sjcl.ecc.point(this,new a(e),new a(f))};
sjcl.ecc.curve.prototype.fromBits=function(a){var b=sjcl.bitArray,c=this.field.prototype.exponent+7&-8;a=new sjcl.ecc.point(this,this.field.fromBits(b.bitSlice(a,0,c)),this.field.fromBits(b.bitSlice(a,c,2*c)));if(!a.isValid())throw new sjcl.exception.corrupt("not on the curve!");return a};
sjcl.ecc.curves={c192:new sjcl.ecc.curve(sjcl.bn.prime.p192,"0xffffffffffffffffffffffff99def836146bc9b1b4d22831",-3,"0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1","0x188da80eb03090f67cbf20eb43a18800f4ff0afd82ff1012","0x07192b95ffc8da78631011ed6b24cdd573f977a11e794811"),c224:new sjcl.ecc.curve(sjcl.bn.prime.p224,"0xffffffffffffffffffffffffffff16a2e0b8f03e13dd29455c5c2a3d",-3,"0xb4050a850c04b3abf54132565044b0b7d7bfd8ba270b39432355ffb4","0xb70e0cbd6bb4bf7f321390b94a03c1d356c21122343280d6115c1d21",
"0xbd376388b5f723fb4c22dfe6cd4375a05a07476444d5819985007e34"),c256:new sjcl.ecc.curve(sjcl.bn.prime.p256,"0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551",-3,"0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b","0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296","0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5"),c384:new sjcl.ecc.curve(sjcl.bn.prime.p384,"0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973",
-3,"0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef","0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7","0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f"),c521:new sjcl.ecc.curve(sjcl.bn.prime.p521,"0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409",-3,"0x051953EB9618E1C9A1F929A21A0B68540EEA2DA725B99B315F3B8B489918EF109E156193951EC7E937B1652C0BD3BB1BF073573DF883D2C34F1EF451FD46B503F00",
"0xC6858E06B70404E9CD9E3ECB662395B4429C648139053FB521F828AF606B4D3DBAA14B5E77EFE75928FE1DC127A2FFA8DE3348B3C1856A429BF97E7E31C2E5BD66","0x11839296A789A3BC0045C8A5FB42C7D1BD998F54449579B446817AFBD17273E662C97EE72995EF42640C550B9013FAD0761353C7086A272C24088BE94769FD16650"),k192:new sjcl.ecc.curve(sjcl.bn.prime.p192k,"0xfffffffffffffffffffffffe26f2fc170f69466a74defd8d",0,3,"0xdb4ff10ec057e9ae26b07d0280b7f4341da5d1b1eae06c7d","0x9b2f2f6d9c5628a7844163d015be86344082aa88d95e2f9d"),k224:new sjcl.ecc.curve(sjcl.bn.prime.p224k,
"0x010000000000000000000000000001dce8d2ec6184caf0a971769fb1f7",0,5,"0xa1455b334df099df30fc28a169a467e9e47075a90f7e650eb6b7a45c","0x7e089fed7fba344282cafbd6f7e319f7c0b0bd59e2ca4bdb556d61a5"),k256:new sjcl.ecc.curve(sjcl.bn.prime.p256k,"0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",0,7,"0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798","0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")};
sjcl.ecc.curveName=function(a){for(var b in sjcl.ecc.curves)if(sjcl.ecc.curves.hasOwnProperty(b)&&sjcl.ecc.curves[b]===a)return b;throw new sjcl.exception.invalid("no such curve");};
sjcl.ecc.deserialize=function(a){if(!a||!a.curve||!sjcl.ecc.curves[a.curve])throw new sjcl.exception.invalid("invalid serialization");if(-1===["elGamal","ecdsa"].indexOf(a.type))throw new sjcl.exception.invalid("invalid type");var b=sjcl.ecc.curves[a.curve];if(a.secretKey){if(!a.exponent)throw new sjcl.exception.invalid("invalid exponent");var c=new sjcl.bn(a.exponent);return new sjcl.ecc[a.type].secretKey(b,c)}if(!a.point)throw new sjcl.exception.invalid("invalid point");c=b.fromBits(sjcl.codec.hex.toBits(a.point));
return new sjcl.ecc[a.type].publicKey(b,c)};
sjcl.ecc.basicKey={publicKey:function(a,b){this.i=a;this.u=a.r.bitLength();b instanceof Array?this.o=a.fromBits(b):this.o=b;this.serialize=function(){var b=sjcl.ecc.curveName(a);return{type:this.getType(),secretKey:!1,point:sjcl.codec.hex.fromBits(this.o.toBits()),curve:b}};this.get=function(){var a=this.o.toBits(),b=sjcl.bitArray.bitLength(a),e=sjcl.bitArray.bitSlice(a,0,b/2),a=sjcl.bitArray.bitSlice(a,b/2);return{x:e,y:a}}},secretKey:function(a,b){this.i=a;this.u=a.r.bitLength();this.L=b;this.serialize=
function(){var b=this.get(),d=sjcl.ecc.curveName(a);return{type:this.getType(),secretKey:!0,exponent:sjcl.codec.hex.fromBits(b),curve:d}};this.get=function(){return this.L.toBits()}}};sjcl.ecc.basicKey.generateKeys=function(a){return function(b,c,d){b=b||0x100;if("number"===typeof b&&(b=sjcl.ecc.curves["c"+b],void 0===b))throw new sjcl.exception.invalid("no such curve");d=d||sjcl.bn.random(b.r,c);c=b.G.mult(d);return{pub:new sjcl.ecc[a].publicKey(b,c),sec:new sjcl.ecc[a].secretKey(b,d)}}};
sjcl.ecc.elGamal={generateKeys:sjcl.ecc.basicKey.generateKeys("elGamal"),publicKey:function(a,b){sjcl.ecc.basicKey.publicKey.apply(this,arguments)},secretKey:function(a,b){sjcl.ecc.basicKey.secretKey.apply(this,arguments)}};sjcl.ecc.elGamal.publicKey.prototype={kem:function(a){a=sjcl.bn.random(this.i.r,a);var b=this.i.G.mult(a).toBits();return{key:sjcl.hash.sha256.hash(this.o.mult(a).toBits()),tag:b}},getType:function(){return"elGamal"}};
sjcl.ecc.elGamal.secretKey.prototype={unkem:function(a){return sjcl.hash.sha256.hash(this.i.fromBits(a).mult(this.L).toBits())},dh:function(a){return sjcl.hash.sha256.hash(a.o.mult(this.L).toBits())},dhJavaEc:function(a){return a.o.mult(this.L).x.toBits()},getType:function(){return"elGamal"}};sjcl.ecc.ecdsa={generateKeys:sjcl.ecc.basicKey.generateKeys("ecdsa")};sjcl.ecc.ecdsa.publicKey=function(a,b){sjcl.ecc.basicKey.publicKey.apply(this,arguments)};
sjcl.ecc.ecdsa.publicKey.prototype={verify:function(a,b,c){sjcl.bitArray.bitLength(a)>this.u&&(a=sjcl.bitArray.clamp(a,this.u));var d=sjcl.bitArray,e=this.i.r,f=this.u,g=sjcl.bn.fromBits(d.bitSlice(b,0,f)),d=sjcl.bn.fromBits(d.bitSlice(b,f,2*f)),h=c?d:d.inverseMod(e),f=sjcl.bn.fromBits(a).mul(h).mod(e),h=g.mul(h).mod(e),f=this.i.G.mult2(f,h,this.o).x;if(g.equals(0)||d.equals(0)||g.greaterEquals(e)||d.greaterEquals(e)||!f.equals(g)){if(void 0===c)return this.verify(a,b,!0);throw new sjcl.exception.corrupt("signature didn't check out");
}return!0},getType:function(){return"ecdsa"}};sjcl.ecc.ecdsa.secretKey=function(a,b){sjcl.ecc.basicKey.secretKey.apply(this,arguments)};
sjcl.ecc.ecdsa.secretKey.prototype={sign:function(a,b,c,d){sjcl.bitArray.bitLength(a)>this.u&&(a=sjcl.bitArray.clamp(a,this.u));var e=this.i.r,f=e.bitLength();d=d||sjcl.bn.random(e.sub(1),b).add(1);b=this.i.G.mult(d).x.mod(e);a=sjcl.bn.fromBits(a).add(b.mul(this.L));c=c?a.inverseMod(e).mul(d).mod(e):a.mul(d.inverseMod(e)).mod(e);return sjcl.bitArray.concat(b.toBits(f),c.toBits(f))},getType:function(){return"ecdsa"}};
/**
 * JavaScript printf/sprintf functions.
 *
 * This code is unrestricted: you are free to use it however you like.
 * 
 * The functions should work as expected, performing left or right alignment,
 * truncating strings, outputting numbers with a required precision etc.
 *
 * For complex cases these functions follow the Perl implementations of
 * (s)printf, allowing arguments to be passed out-of-order, and to set
 * precision and output-length from other argument
 *
 * See http://perldoc.perl.org/functions/sprintf.html for more information.
 *
 * Implemented flags:
 *
 * - zero or space-padding (default: space)
 *     sprintf("%4d", 3) ->  "   3"
 *     sprintf("%04d", 3) -> "0003"
 *
 * - left and right-alignment (default: right)
 *     sprintf("%3s", "a") ->  "  a"
 *     sprintf("%-3s", "b") -> "b  "
 *
 * - out of order arguments (good for templates & message formats)
 *     sprintf("Estimate: %2$d units total: %1$.2f total", total, quantity)
 *
 * - binary, octal and hex prefixes (default: none)
 *     sprintf("%b", 13) ->    "1101"
 *     sprintf("%#b", 13) ->   "0b1101"
 *     sprintf("%#06x", 13) -> "0x000d"
 *
 * - positive number prefix (default: none)
 *     sprintf("%d", 3) -> "3"
 *     sprintf("%+d", 3) -> "+3"
 *     sprintf("% d", 3) -> " 3"
 *
 * - min/max width (with truncation); e.g. "%9.3s" and "%-9.3s"
 *     sprintf("%5s", "catfish") ->    "catfish"
 *     sprintf("%.5s", "catfish") ->   "catfi"
 *     sprintf("%5.3s", "catfish") ->  "  cat"
 *     sprintf("%-5.3s", "catfish") -> "cat  "
 *
 * - precision (see note below); e.g. "%.2f"
 *     sprintf("%.3f", 2.1) ->     "2.100"
 *     sprintf("%.3e", 2.1) ->     "2.100e+0"
 *     sprintf("%.3g", 2.1) ->     "2.10"
 *     sprintf("%.3p", 2.1) ->     "2.1"
 *     sprintf("%.3p", '2.100') -> "2.10"
 *
 * Deviations from perl spec:
 * - %n suppresses an argument
 * - %p and %P act like %g, but without over-claiming accuracy:
 *   Compare:
 *     sprintf("%.3g", "2.1") -> "2.10"
 *     sprintf("%.3p", "2.1") -> "2.1"
 *
 * @version 2011.09.23
 * @author Ash Searle
 */
function sprintf() {
    function pad(str, len, chr, leftJustify) {
	var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
	return leftJustify ? str + padding : padding + str;

    }

    function justify(value, prefix, leftJustify, minWidth, zeroPad) {
	var diff = minWidth - value.length;
	if (diff > 0) {
	    if (leftJustify || !zeroPad) {
		value = pad(value, minWidth, ' ', leftJustify);
	    } else {
		value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
	    }
	}
	return value;
    }

    var a = arguments, i = 0, format = a[i++];
    return format.replace(sprintf.regex, function(substring, valueIndex, flags, minWidth, _, precision, type) {
	    if (substring == '%%') return '%';

	    // parse flags
	    var leftJustify = false, positivePrefix = '', zeroPad = false, prefixBaseX = false;
	    for (var j = 0; flags && j < flags.length; j++) switch (flags.charAt(j)) {
		case ' ': positivePrefix = ' '; break;
		case '+': positivePrefix = '+'; break;
		case '-': leftJustify = true; break;
		case '0': zeroPad = true; break;
		case '#': prefixBaseX = true; break;
	    }

	    // parameters may be null, undefined, empty-string or real valued
	    // we want to ignore null, undefined and empty-string values

	    if (!minWidth) {
		minWidth = 0;
	    } else if (minWidth == '*') {
		minWidth = +a[i++];
	    } else if (minWidth.charAt(0) == '*') {
		minWidth = +a[minWidth.slice(1, -1)];
	    } else {
		minWidth = +minWidth;
	    }

	    // Note: undocumented perl feature:
	    if (minWidth < 0) {
		minWidth = -minWidth;
		leftJustify = true;
	    }

	    if (!isFinite(minWidth)) {
		throw new Error('sprintf: (minimum-)width must be finite');
	    }

	    if (precision && precision.charAt(0) == '*') {
		precision = +a[(precision == '*') ? i++ : precision.slice(1, -1)];
		if (precision < 0) {
		    precision = null;
		}
	    }

	    if (precision == null) {
		precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : void(0);
	    } else {
		precision = +precision;
	    }

	    // grab value using valueIndex if required?
	    var value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];
	    var prefix, base;

	    switch (type) {
		case 'c': value = String.fromCharCode(+value);
		case 's': {
			      // If you'd rather treat nulls as empty-strings, uncomment next line:
			      // if (value == null) return '';

			      value = String(value);
			      if (precision != null) {
				  value = value.slice(0, precision);
			      }
			      prefix = '';
			      break;
			  }
		case 'b': base = 2; break;
		case 'o': base = 8; break;
		case 'u': base = 10; break;
		case 'x': case 'X': base = 16; break;
		case 'i':
		case 'd': {
			      var number = parseInt(+value);
			      if (isNaN(number)) {
				  return '';
			      }
			      prefix = number < 0 ? '-' : positivePrefix;
			      value = prefix + pad(String(Math.abs(number)), precision, '0', false);
			      break;
			  }
		case 'e': case 'E':
		case 'f': case 'F':
		case 'g': case 'G':
		case 'p': case 'P':
		          {
			      var number = +value;
			      if (isNaN(number)) {
				  return '';
			      }
			      prefix = number < 0 ? '-' : positivePrefix;
			      var method;
			      if ('p' != type.toLowerCase()) {
				  method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
			      } else {
				  // Count significant-figures, taking special-care of zeroes ('0' vs '0.00' etc.)
				  var sf = String(value).replace(/[eE].*|[^\d]/g, '');
				  sf = (number ? sf.replace(/^0+/,'') : sf).length;
				  precision = precision ? Math.min(precision, sf) : precision;
				  method = (!precision || precision <= sf) ? 'toPrecision' : 'toExponential';
			      }
			      var number_str = Math.abs(number)[method](precision);
			      // number_str = thousandSeparation ? thousand_separate(number_str): number_str;
			      value = prefix + number_str;
			      break;
			  }
		case 'n': return '';
		default: return substring;
	    }

	    if (base) {
		// cast to non-negative integer:
		var number = value >>> 0;
		prefix = prefixBaseX && base != 10 && number && ['0b', '0', '0x'][base >> 3] || '';
		value = prefix + pad(number.toString(base), precision || 0, '0', false);
	    }
	    var justified = justify(value, prefix, leftJustify, minWidth, zeroPad);
	    return ('EFGPX'.indexOf(type) > -1) ? justified.toUpperCase() : justified;
    });
}
sprintf.regex = /%%|%(\d+\$)?([-+#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuidfegpEGP])/g;

/**
 * Trival printf implementation, probably only useful during page-load.
 * Note: you may as well use "document.write(sprintf(....))" directly
 */
function printf() {
    // delegate the work to sprintf in an IE5 friendly manner:
    var i = 0, a = arguments, args = Array(arguments.length);
    while (i < args.length) args[i] = 'a[' + (i++) + ']';
    document.write(eval('sprintf(' + args + ')'));
}
"use strict";
/**
 * EnigmaBridge API helper functions.
 * @author Dusan Klinec (ph4r05)
 * @license GPL3.
 */

/**
 * Monkey-patching for prototype inheritance.
 *
 * @param parentClassOrObject
 * @param newPrototype
 * @returns {Function}
 */
Function.prototype.inheritsFrom = function( parentClassOrObject, newPrototype ){
    if ( parentClassOrObject.constructor == Function )
    {
        //Normal Inheritance
        this.prototype = new parentClassOrObject;
        this.prototype.constructor = this;
        this.prototype.parent = parentClassOrObject.prototype;

        // Better for calling super methods. Avoids looping.
        this.superclass = parentClassOrObject.prototype;
        this.prototype = $.extend(this.prototype, newPrototype);

        // If we have inheritance chain A->B->C, A = root, A defines method x()
        // B also defines x = function() { this.parent.x.call(this); }, C does not defines x,
        // then calling x on C will cause infinite loop because this references to C in B.x() and this.parent is B in B.x()
        // not A as desired.
    }
    else
    {
        //Pure Virtual Inheritance
        this.prototype = parentClassOrObject;
        this.prototype.constructor = this;
        this.prototype.parent = parentClassOrObject;
        this.superclass = parentClassOrObject;
    }
    return this;
};

/**
 * SHA1 implementation, not present in default SJCL.
 * We need it for HOTP.
 * @param a
 */
sjcl.hash.sha1 = function(a) {
    if (a) {
        this._h = a._h.slice(0);
        this._buffer = a._buffer.slice(0);
        this._length = a._length
    } else {
        this.reset()
    }
};
sjcl.hash.sha1.hash = function(a) {
    return (new sjcl.hash.sha1()).update(a).finalize()
};
sjcl.hash.sha1.prototype = {
    blockSize: 512,
    reset: function() {
        this._h = this._init.slice(0);
        this._buffer = [];
        this._length = 0;
        return this
    },
    update: function(f) {
        if (typeof f === "string") {
            f = sjcl.codec.utf8String.toBits(f)
        }
        var e, a = this._buffer = sjcl.bitArray.concat(this._buffer, f), d = this._length, c = this._length = d + sjcl.bitArray.bitLength(f);
        for (e = this.blockSize + d & -this.blockSize; e <= c; e += this.blockSize) {
            this._block(a.splice(0, 16))
        }
        return this
    },
    finalize: function() {
        var c, a = this._buffer, d = this._h;
        a = sjcl.bitArray.concat(a, [sjcl.bitArray.partial(1, 1)]);
        for (c = a.length + 2; c & 15; c++) {
            a.push(0)
        }
        a.push(Math.floor(this._length / 4294967296));
        a.push(this._length | 0);
        while (a.length) {
            this._block(a.splice(0, 16))
        }
        this.reset();
        return d
    },
    _init: [1732584193, 4023233417, 2562383102, 271733878, 3285377520],
    _key: [1518500249, 1859775393, 2400959708, 3395469782],
    _f: function(e, a, g, f) {
        if (e <= 19) {
            return (a & g) | (~a & f)
        } else {
            if (e <= 39) {
                return a ^ g ^ f
            } else {
                if (e <= 59) {
                    return (a & g) | (a & f) | (g & f)
                } else {
                    if (e <= 79) {
                        return a ^ g ^ f
                    }
                }
            }
        }
    },
    _S: function(b, a) {
        return (a << b) | (a >>> 32 - b)
    },
    _block: function(n) {
        var r, g, p, o, m, l, j, q = n.slice(0), i = this._h, f = this._key;
        p = i[0];
        o = i[1];
        m = i[2];
        l = i[3];
        j = i[4];
        for (r = 0; r <= 79; r++) {
            if (r >= 16) {
                q[r] = this._S(1, q[r - 3] ^ q[r - 8] ^ q[r - 14] ^ q[r - 16])
            }
            g = (this._S(5, p) + this._f(r, o, m, l) + j + q[r] + this._key[Math.floor(r / 20)]) | 0;
            j = l;
            l = m;
            m = this._S(30, o);
            o = p;
            p = g
        }
        i[0] = (i[0] + p) | 0;
        i[1] = (i[1] + o) | 0;
        i[2] = (i[2] + m) | 0;
        i[3] = (i[3] + l) | 0;
        i[4] = (i[4] + j) | 0
    }
};

/**
 * Bit array codec implementations.
 * @author Nils Kenneweg
 */
sjcl.codec.base32 = {
    /** The base32 alphabet.
     * @private
     */
    _chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    _hexChars: "0123456789ABCDEFGHIJKLMNOPQRSTUV",

    /* bits in an array */
    BITS: 32,
    /* base to encode at (2^x) */
    BASE: 5,
    /* bits - base */
    REMAINING: 27,

    /** Convert from a bitArray to a base32 string. */
    fromBits: function (arr, _noEquals, _hex) {
        var BITS = sjcl.codec.base32.BITS, BASE = sjcl.codec.base32.BASE, REMAINING = sjcl.codec.base32.REMAINING;
        var out = "", i, bits=0, c = sjcl.codec.base32._chars, ta=0, bl = sjcl.bitArray.bitLength(arr);

        if (_hex) {
            c = sjcl.codec.base32._hexChars;
        }

        for (i=0; out.length * BASE < bl; ) {
            out += c.charAt((ta ^ arr[i]>>>bits) >>> REMAINING);
            if (bits < BASE) {
                ta = arr[i] << (BASE-bits);
                bits += REMAINING;
                i++;
            } else {
                ta <<= BASE;
                bits -= BASE;
            }
        }
        while ((out.length & 7) && !_noEquals) { out += "="; }

        return out;
    },

    /** Convert from a base32 string to a bitArray */
    toBits: function(str, _hex) {
        str = str.replace(/\s|=/g,'').toUpperCase();
        var BITS = sjcl.codec.base32.BITS, BASE = sjcl.codec.base32.BASE, REMAINING = sjcl.codec.base32.REMAINING;
        var out = [], i, bits=0, c = sjcl.codec.base32._chars, ta=0, x, format="base32";

        if (_hex) {
            c = sjcl.codec.base32._hexChars;
            format = "base32hex"
        }

        for (i=0; i<str.length; i++) {
            x = c.indexOf(str.charAt(i));
            if (x < 0) {
                // Invalid character, try hex format
                if (!_hex) {
                    try {
                        return sjcl.codec.base32hex.toBits(str);
                    }
                    catch (e) {}
                }
                throw new sjcl.exception.invalid("this isn't " + format + "!");
            }
            if (bits > REMAINING) {
                bits -= REMAINING;
                out.push(ta ^ x>>>bits);
                ta  = x << (BITS-bits);
            } else {
                bits += BASE;
                ta ^= x << (BITS-bits);
            }
        }
        if (bits&56) {
            out.push(sjcl.bitArray.partial(bits&56, ta, 1));
        }
        return out;
    }
};
sjcl.codec.base32hex = {
    fromBits: function (arr, _noEquals) { return sjcl.codec.base32.fromBits(arr,_noEquals,1); },
    toBits: function (str) { return sjcl.codec.base32.toBits(str,1); }
};

/**
 * Base EB package.
 * @type {{name: string}}
 */
var eb = {
    name: "EB",
    /** @namespace Exceptions. */
    exception: {
        /** @constructor Ciphertext is corrupt. */
        corrupt: function (message) {
            this.toString = function () {
                return "CORRUPT: " + this.message;
            };
            this.message = message;
        },
        /** @constructor Invalid input. */
        invalid: function (message) {
            this.toString = function () {
                return "INVALID: " + this.message;
            };
            this.message = message;
        },
    }
};

/**
 * EB misc wrapper.
 * @type {{name: string, genNonce: eb.misc.genNonce, genHexNonce: eb.misc.genHexNonce, genAlphaNonce: eb.misc.genAlphaNonce, xor: eb.misc.xor}}
 */
eb.misc = {
    name: "misc",
    genNonce: function(length, alphabet){
        var nonce = "";
        var alphabetLen = alphabet.length;
        var i = 0;

        for(i = 0; i < length; i++){
            nonce += alphabet.charAt(((sjcl.random.randomWords(1)[0]) & 0xffff) % alphabetLen);
        }

        return nonce;
    },
    genHexNonce: function(length){
        return this.genNonce(length, "0123456789abcdef");
    },
    genAlphaNonce: function (length){
        return this.genNonce(length, "0123456789abcdefghijklmnopqrstuvwxyz");
    },
    xor: function(x,y){
        return [x[0]^y[0],x[1]^y[1],x[2]^y[2],x[3]^y[3]];
    },
    absorb: function(dst, src){
        if (src === undefined){
            return dst;
        }

        for(var key in src) {
            if (src.hasOwnProperty(key)) {
                dst[key] = src[key];
            }
        }
        return dst;
    },
    absorbKey: function(dst, src, key){
        if (src !== undefined && key in src){
            dst[key] = src[key];
        }
        return dst;
    },
    absorbKeyEx: function(dst, src, srcKey, dstKey){
        if (src !== undefined && srcKey in src){
            dst[dstKey] = src[srcKey];
        }
        return dst;
    },
    absorbValue: function(dst, value, valueKey, defaultValue){
        if (value !== undefined){
            dst[valueKey] = value;
        } else if (defaultValue !== undefined){
            dst[valueKey] = defaultValue;
        }
    },

    /**
     * Converts argument to the SJCL bitArray.
     * @param x
     *      if x is a number, it is converted to SJCL bitArray. Warning, 32bit numbers are supported only.
     *      if x is a string, it is considered as hex coded string.
     *      if x is an array it is considered as SJCL bitArray.
     * @returns {*}
     */
    inputToBits: function(x){
        var ln;
        if (typeof(x) === 'number'){
            return sjcl.codec.hex.toBits(sprintf("%02x", x));

        } else if (typeof(x) === 'string') {
            x = x.trim().replace(/^0x/, '');
            if (!(x.match(/^[0-9A-Fa-f]+$/))){
                throw new eb.exception.invalid("Invalid hex coded number");
            }

            return sjcl.codec.hex.toBits(x);

        } else {
            return x;

        }
    },

    /**
     * Converts argument to the hexcoded string.
     * @param x -
     *      if x is a number, will be converted to a hex string. Warning, 32bit numbers are supported only.
     *      if x is a string, it is considered as hex coded string.
     *      if x is an array it is considered as SJCL bitArray.
     */
    inputToHex: function(x){
        var tmp,ln;
        if (typeof(x) === 'number'){
            return sprintf("%x", x);

        } else if (typeof(x) === 'string') {
            x = x.trim().replace(/^0x/, '');
            if (!(x.match(/^[0-9A-Fa-f]+$/))){
                throw new eb.exception.invalid("Invalid hex coded number");
            }

            return x;

        } else {
            return sjcl.codec.hex.fromBits(x);

        }
    },

    /**
     * Converts argument to the integer. If string is passed, it is considered as hex-coded integer.
     * @param x
     * @param noThrow
     */
    inputToHexNum: function(x, noThrow){
        var tmp,ln;
        if (typeof(x) === 'number'){
            return x;

        } else if (typeof(x) === 'string') {
            x = x.trim().replace(/^0x/, '');
            if (!(x.match(/^[0-9A-Fa-f]+$/))){
                throw new eb.exception.invalid("Invalid hex coded number");
            }

            return parseInt(x, 16);

        } else if (noThrow === undefined || !noThrow) {
            throw new eb.exception.invalid("Invalid argument - not a number or string");

        } else {
            return x;

        }
    },

    /**
     * Left zero padding to the even number of hexcoded digits.
     * @param x
     * @returns {*}
     */
    padHexToEven: function(x){
        x = x.trim().replace(/[\s]+/g, '').replace(/^0x/, '');
        return ((x.length & 1) == 1) ? ('0'+x) : x;
    },

    /**
     * Left zero padding for hex string to the given size.
     * @param x
     * @param size
     * @returns {*}
     */
    padHexToSize: function(x, size){
        x = x.trim().replace(/[\s]+/g, '').replace(/^0x/, '');
        return (x.length<size) ? (('0'.repeat(size-x.length))+x) : x
    },

    /**
     * Generates checksum value from the input.
     * @param x hexcoded string or bitArray. If you want to checksum arbitrary string, hash it first.
     * @param size
     */
    genChecksumValue: function(x, size){
        var inputBits = eb.misc.inputToBits(x);

        // As we are reducing information from x to base32*size bits, we are performing
        // two hash rounds to make sure the dependency is non-trivial.
        var toHash = sjcl.codec.hex.fromBits(inputBits) + ',' + size + ',' + sjcl.bitArray.bitLength(inputBits);
        var inputHashBits = sjcl.hash.sha256.hash(toHash);
        var inputHashBits2 = sjcl.hash.sha256.hash(sjcl.codec.hex.fromBits(inputHashBits) + toHash);
        var hashOut = [], i;
        for(i=0; i<256/32; i++){
            hashOut[i] = inputHashBits[i] ^ inputHashBits2[i];
        }

        // Base 32, size first characters
        var base32string = sjcl.codec.base32.fromBits(hashOut);
        return base32string.substring(0, size);
    },

    /**
     * Generates checksum value from the input.
     * @param x an arbitraty string
     * @param size
     */
    genChecksumValueFromString: function(x, size){
        return eb.misc.genChecksumValue(sjcl.hash.sha256.hash(x), size);
    }
};

eb.codec = {};

/**
 * Fault tolerant utf8 codec for user entries.
 * When converting from hexcoded string to raw data, data may contain both UTF8 characters and hex-coded characters.
 * Parsing result finds utf8 characters in the hexbytes. If byte sequence does not form valid utf8 character, it is
 * parsed as ordinary hex sequence.
 *
 * When converting from raw data to hexdata, utf8 characters are allowed. Moreover it supports individual byte coding
 * \x[A-Fa-f0-9]{2} and backslash escaping \\. Single individual backslash is ignored.
 * @type {{}}
 */
eb.codec.utf8 = {
    toHex: function(x, options) {
        var i, ln = x.length;
        var out = "";

        for (i = 0; i < ln; i++) {
            var cChar = x.charAt(i);
            var remChars = (ln - i - 1);

            if (cChar === '\\') {
                // Byte coding \xFF ?
                if (remChars >= 3) {
                    var hCode = x.substring(i, i + 4);
                    var hRegex = /\\x([a-fA-F0-9]{2})/g;
                    var match = hRegex.exec(hCode);
                    if (match) {
                        out += match[1];
                        i += 3;
                        continue;
                    }
                }

                // Escaping \\ ?
                if (remChars >= 1) {
                    var nChar = x.substring(i + 1, i + 2);
                    if (nChar === '\\') {
                        out += Number('\\'.charCodeAt(0)).toString(16);
                        i += 1;
                        continue;
                    }
                }

                // Invalid escaping, ignore this backslash.
                continue;
            }

            // Get UTF8 hex representation.
            var cc = unescape(encodeURIComponent(cChar));
            var jj, llen;
            for (jj = 0, llen = cc.length; jj < llen; jj++) {
                var chNum = (Number(cc.charCodeAt(jj))).toString(16);
                if ((chNum.length & 1) == 1) {
                    chNum = "0" + chNum;
                }
                out += chNum;
            }
        }

        return out;
    },

    /**
     * Converts hexcoded string to raw data.
     * @param x
     * @param options
     * @returns {string}
     */
    fromHex: function(x, options) {
        var parsed = eb.codec.utf8.fromHexParse(x, options);
        var str="";
        var cur, i, len;
        for(i=0, len=parsed.parsed.length; i<len; i++){
            cur=parsed.parsed[i];
            str += cur.utf8 ? cur.rep : cur.enc;
        }

        return str;
    },

    /**
     * Parses hex coded string, can accept utf8 characters.
     * @param x
     * @param options,
     *      - if acceptUtf8==false, UTF8 characters are not recognized, each character has 1 byte encoding. Default = true,
     *        thus UTF8 characters are recognized and parsed.
     *      - if acceptOnlyUtf8==true, non-UTF8 characters are skipped, otherwise they are parsed as hexcoded.
     *
     * @returns {{nonUtf8Chars: number, parsed: Array}}
     */
    fromHexParse: function(x, options) {
        var defaults = {
            'acceptUtf8': true,
            'acceptOnlyUtf8': false
        };

        options = $.extend(defaults, options || {});
        var acceptUtf8 = options && options.acceptUtf8;
        var acceptOnlyUtf8 = options && options.acceptOnlyUtf8;

        // Process only even lengths.
        var ln = x.length;
        if ((ln & 1) == 1) {
            ln-=1;
        }

        var nonUtf8Chars = 0;
        var i, cByte, cBits, cStr, cNum;
        var out = [];

        // UTF8 encoding table
        //7 	U+0000	    U+007F	    1	0xxxxxxx
        //11	U+0080	    U+07FF	    2	110xxxxx	10xxxxxx
        //16	U+0800	    U+FFFF	    3	1110xxxx	10xxxxxx	10xxxxxx
        //21	U+10000	    U+1FFFFF	4	11110xxx	10xxxxxx	10xxxxxx	10xxxxxx
        //26	U+200000	U+3FFFFFF	5	111110xx	10xxxxxx	10xxxxxx	10xxxxxx	10xxxxxx
        //31	U+4000000	U+7FFFFFFF	6	1111110x	10xxxxxx	10xxxxxx	10xxxxxx	10xxxxxx	10xxxxxx
        for(i=0; i<ln; i+=2){
            cByte = (x[i] + x[i+1]).toUpperCase();
            cBits = h.toBits(cByte);
            cNum = sjcl.bitArray.extract(cBits,0,8);

            // 1byte char representation. ASCII.
            if (!acceptUtf8 || (cNum & 0x80) == 0){
                var tmpChar = String.fromCharCode(cNum);
                if (tmpChar === "\\"){
                    tmpChar = "\\\\";
                }

                out.push({
                    'b':1,
                    'utf8':true,
                    'hex':cByte,
                    'enc':String.fromCharCode(cNum),
                    'rep':cNum < 32 || cNum >= 127 ? "\\x" + cByte : tmpChar});
                continue;
            }

            // Look for utf8 character.
            var remBytes = (ln-i-2)/2;
            var valid = false;
            var j = 0;
            for(j=2; j<=6; j++){
                // Create first UTF8 byte mask signature, j = number of bytes character occupies.
                var signature = (Math.pow(2, j)-1)<<1;
                var byteLow = cNum >> (8-j-1);
                if (signature !== byteLow){
                    continue;
                }

                // Signature matched, check if there is enough number of bytes in the buffer
                if (remBytes < (j-1)){
                    break;
                }

                // Start building \uxxxx representation.
                var utfOut = h.toBits(sprintf("0000%x", cNum & ((1<<(8-j-1))-1) ) );
                var utfOutLen = sjcl.bitArray.bitLength(utfOut);
                if (utfOutLen > (8-j-1)){
                    utfOut = sjcl.bitArray.bitSlice(utfOut, utfOutLen-(8-j-1));
                }

                // Check if each next byte has 10xxxxxx format.
                var k = 0;
                var byteValid = true;
                for(k=0; k<j-1; k++){
                    var nByte = eb.codec.utf8.getByte(x, i+2+2*k);
                    if ((nByte >>> 6) != 2){
                        byteValid = false;
                        break;
                    }

                    var cBitArray = h.toBits(sprintf("0000%x", nByte & ((1<<6)-1) ) );
                    var cBitLen = sjcl.bitArray.bitLength(cBitArray);
                    if (cBitLen >= 7){
                        cBitArray = sjcl.bitArray.bitSlice(cBitArray, cBitLen-6);
                    }

                    utfOut = sjcl.bitArray.concat(utfOut, cBitArray);
                }

                // Successing were not in the 10xxxxxx format.
                if(!byteValid){
                    break;
                }

                // utfOut needs to be left padded with zeros to be correctly interpreted.
                utfOutLen = sjcl.bitArray.bitLength(utfOut);
                if ((utfOutLen & 7) != 0){
                    var toPadLen = 8-(utfOutLen & 7);
                    utfOut = sjcl.bitArray.concat(sjcl.bitArray.bitSlice(h.toBits("00"),0,toPadLen), utfOut);
                }

                valid=true;
                out.push({
                    'b':j,
                    'utf8':true,
                    'hex':cByte + x.substring(i+2, i+2+(j-1)*2),
                    'enc':"\\u" + h.fromBits(utfOut),
                    'rep':String.fromCharCode(parseInt(h.fromBits(utfOut), 16))
                });

                i+=2*(j-1);
                break;
            }

            if (valid || acceptOnlyUtf8){
                continue;
            }

            out.push({
                'b':1,
                'utf8':false,
                'hex':cByte,
                'enc':"\\x" + cByte,
                'rep':"\\x" + cByte});

            nonUtf8Chars+=1;
        }

        return {'nonUtf8Chars':nonUtf8Chars, 'parsed':out};
    },

    getByte: function (str, offset){
        var cByte = str[offset] + str[offset+1];
        var cBits = h.toBits(cByte);
        return sjcl.bitArray.extract(cBits,0,8);
    }
};

/**
 * EB padding schemes wrapper.
 * @type {{name: string}}
 */
eb.padding = {
    name: "padding"
};

/**
 * Padding - identity function.
 * @type {{name: string, pad: eb.padding.empty.pad, unpad: eb.padding.empty.unpad}}
 */
eb.padding.empty = {
    name: "empty",
    pad: function(a, blocklen){
        return a;
    },
    unpad: function(a, blocklen){
        return a;
    }
};

/**
 * PKCS7 padding.
 * @type {{name: string, pad: eb.padding.pkcs7.pad, unpad: eb.padding.pkcs7.unpad}}
 */
eb.padding.pkcs7 = {
    name: "pkcs7",
    pad: function(a, blocklen){
        blocklen = blocklen || 16;
        if (!blocklen || (blocklen & (blocklen - 1))){
            throw new sjcl.exception.corrupt("blocklength has to be power of 2");
        }
        if (blocklen != 16){
            throw new sjcl.exception.corrupt("blocklength different than 16 is not implemented yet");
            // TODO: implement multiple block sizes.
        }

        var bl = sjcl.bitArray.bitLength(a);
        var padLen = (16 - ((bl >> 3) & 15));
        var padFill = padLen * 0x1010101;
        return sjcl.bitArray.concat(a, [padFill, padFill, padFill, padFill]).slice(0, ((bl >> 3) + padLen) >> 2);
    },
    unpad: function(a, blocklen){
        blocklen = blocklen || 16;
        if (!blocklen || (blocklen & (blocklen - 1))){
            throw new sjcl.exception.corrupt("blocklength has to be power of 2");
        }
        if (blocklen != 16){
            throw new sjcl.exception.corrupt("blocklength different than 16 is not implemented yet");
            // TODO: implement multiple block sizes.
        }

        var w = sjcl.bitArray;
        var bl = w.bitLength(a);
        if (bl & 127 || !a.length) {
            throw new sjcl.exception.corrupt("input must be a positive multiple of the block size");
        }

        var bi = a[((bl>>3)>>2) - 1] & 255;
        if (bi == 0 || bi > 16) {
            throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
        }

        var bo = bi * 0x1010101;
        if (!w.equal(w.bitSlice([bo, bo, bo, bo], 0, bi << 3), w.bitSlice(a, (a.length << 5) - (bi << 3), a.length << 5))) {
            throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
        }

        return w.bitSlice(a, 0, (a.length << 5) - (bi << 3));
    }
};

/**
 *  PKCS 1.5 padding for RSA operation.
 *
 *  EB = 00 || BT || PS || 00 || D
 *      .. EB = encryption block
 *      .. 00 prefix so EB is not bigger than modulus.
 *      .. BT = 1B block type {00, 01} for private key operation, {02} for public key operation.
 *      .. PS = padding string. Has length k - 3 - len(D).
 *      if BT == 0, then padding consists of 0x0, but we need to know size of data in order to remove padding unambiguously.
 *      if BT == 1, then padding consists of 0xFF.
 *      if BT == 2, then padding consists of randomly generated bytes, does not contain 0x00 byte.
 *      .. D  = data
 *      [https://tools.ietf.org/html/rfc2313 PKCS#1 1.5]
 *
 * @type {{name: string, unpad: eb.padding.pkcs15.unpad, const: *, char: *}}
 */
eb.padding.pkcs15 = {
    name: "pkcs1.5",
    pad: function(a, blockLength, bt){
        var w = sjcl.bitArray;
        var h = sjcl.codec.hex;
        var bl = w.bitLength(a);
        var blb = bl / 8;
        if (bt === undefined){
            bt = 0;
        }
        if (bl & 7 || !a.length) {
            throw new sjcl.exception.corrupt("input type has to have be byte padded, bl="+bl);
        }

        if (bt != 0 && bt != 1 && bt != 2){
            throw new sjcl.exception.corrupt("invalid BT size");
        }

        if (blb+3 > blockLength){
            throw new sjcl.exception.corrupt("data to pad is too big for the padding block length");
        }

        var psLen = blockLength - 3 - blb;
        var ps = [], i, tmp=0;
        for (i=0; i<psLen; i++) {
            var curByte = 0;
            if (bt == 1){
                curByte = 0xff;
            } else if (bt == 2){
                do {
                    curByte = (sjcl.random.randomWords(1)[0]) & 0xff;
                }while(curByte == 0);
            }

            tmp = tmp << 8 | curByte;
            if ((i&3) === 3) {
                ps.push(tmp);
                tmp = 0;
            }
        }
        if (i&3) {
            ps.push(sjcl.bitArray.partial(8*(i&3), tmp));
        }

        var baBuff = h.toBits("00");
        baBuff = w.concat(baBuff, h.toBits(sprintf("%02x", bt)));
        baBuff = w.concat(baBuff, ps);
        baBuff = w.concat(baBuff, h.toBits("00"));
        return w.concat(baBuff, a);
    },
    unpad: function(a){
        var w = sjcl.bitArray;
        var bl = w.bitLength(a);
        var blb = bl / 8;
        if (bl & 7 || blb < 3 || !a.length) {
            throw new sjcl.exception.corrupt("data size block is invalid");
        }

        // Check the first byte.
        var bOffset = 0;
        var prefixByte = w.extract(a, bOffset, 8);
        if (prefixByte != 0x0){
            throw new sjcl.exception.corrupt("data size block is invalid");
        }

        bOffset += 8;
        var bt = w.extract(a, bOffset, 8);

        // BT can be only from set {0,1,2}.
        if (bt != 0 && bt != 1 && bt != 2){
            throw new sjcl.exception.corrupt("Padding data error, BT is outside of the definition set");
        }

        // Find D in the padded data. Strategy depends on the BT.
        var dataPosStart = -1, i= 0, cur=0;
        if (bt == 0){
            // Scan for first non-null character.
            for(i = 2; i < blb; i++){
                cur = w.extract(a, 8*i, 8);
                if (cur != 0){
                    dataPosStart = i;
                    break;
                }
            }

        } else if (bt == 1){
            // Find 0x0, report failure in 0xff
            var ffCorrect = true;
            for(i = 2; i < blb; i++){
                cur = w.extract(a, 8*i, 8);
                if (cur != 0 && cur != 0xff) {
                    ffCorrect = false;
                }

                if (cur == 0){
                    dataPosStart = i+1;
                    break;
                }
            }

            if (!ffCorrect){
                throw new sjcl.exception.corrupt("Trail of 0xFF in padding contains also unexpected characters");
            }

        } else {
            // bt == 2, find 0x0.
            for(i = 2; i < blb; i++){
                cur = w.extract(a, 8*i, 8);
                if (cur == 0){
                    dataPosStart = i+1;
                    break;
                }
            }
        }

        // If data position is out of scope, return nothing.
        if (dataPosStart < 0 || dataPosStart > blb){
            throw new sjcl.exception.corrupt("Padding could not be parsed, dataStart=" + dataPosStart + ", len="+blb);
        }

        // Check size of the output buffer.
        var dataLen = blb - dataPosStart;
        return w.bitSlice(a, dataPosStart*8);
    }
};

/**
 * Extracts 32bit number from the bitArray.
 * Original extract does not work with blength = 32 as 1<<32 == 1, it returns 0 always.
 *
 * @param a
 * @param bstart
 * @returns {*}
 */
sjcl.bitArray.extract32 = function(a, bstart){
    var x, sh = Math.floor((-bstart-32) & 31);
    if ((bstart + 32 - 1 ^ bstart) & -32) {
        x = (a[bstart/32|0] << (32 - sh)) ^ (a[bstart/32+1|0] >>> sh);
    } else {
        x = a[bstart/32|0] >>> sh;
    }
    return x;
};

/**
 * CBC-MAC with given cipher & padding.
 * @param Cipher
 * @param bs
 * @param padding
 */
sjcl.misc.hmac_cbc = function (Cipher, bs, padding) {
    this._cipher = Cipher;
    this._bs = bs = bs || 16;
    this._padding = padding = padding || eb.padding.empty;
};

/**
 * HMAC with the specified hash function.  Also called encrypt since it's a prf.
 * @param {bitArray|String} data The data to mac.
 */
sjcl.misc.hmac_cbc.prototype.encrypt = sjcl.misc.hmac_cbc.prototype.mac = function (data) {
    var i, w = sjcl.bitArray, bl = w.bitLength(data), bp = 0, output = [], xor = eb.misc.xor;
    var bsb = this._bs << 3;

    data = this._padding.pad(data, this._bs);
    var c = sjcl.codec.hex.toBits('00'.repeat(this._bs));
    for (i = 0; bp + bsb <= bl; i += 4, bp += bsb) {
        c = this._cipher.encrypt(xor(c, data.slice(i, i + 4)));
    }
    return c;
};

/**
 * CBC encryption mode.
 * @type {{name: string, encrypt: sjcl.mode.cbc.encrypt, decrypt: sjcl.mode.cbc.decrypt}}
 */
sjcl.mode.cbc = {
    name: "cbc",
    encrypt: function (a, b, c, d, noPad) {
        if (d && d.length) {
            throw new sjcl.exception.invalid("cbc can't authenticate data");
        }
        if (sjcl.bitArray.bitLength(c) !== 128) {
            throw new sjcl.exception.invalid("cbc iv must be 128 bits");
        }

        var i, w = sjcl.bitArray, bl = w.bitLength(b), bp = 0, output = [], xor = eb.misc.xor;
        if (noPad && (bl & 127) != 0){
            throw new sjcl.exception.invalid("when padding is disabled, plaintext has to be a positive multiple of a block size");
        }
        if ((bl & 7) != 0) {
            throw new sjcl.exception.invalid("pkcs#5 padding only works for multiples of a byte");
        }

        for (i = 0; bp + 128 <= bl; i += 4, bp += 128) {
            c = a.encrypt(xor(c, b.slice(i, i + 4)));
            output.splice(i, 0, c[0], c[1], c[2], c[3]);
        }

        if (!noPad){
            bl = (16 - ((bl >> 3) & 15)) * 0x1010101;
            c = a.encrypt(xor(c, w.concat(b, [bl, bl, bl, bl]).slice(i, i + 4)));
            output.splice(i, 0, c[0], c[1], c[2], c[3]);
        }

        return output;
    },
    decrypt: function (a, b, c, d, noPad) {
        if (d && d.length) {
            throw new sjcl.exception.invalid("cbc can't authenticate data");
        }
        if (sjcl.bitArray.bitLength(c) !== 128) {
            throw new sjcl.exception.invalid("cbc iv must be 128 bits");
        }
        if ((sjcl.bitArray.bitLength(b) & 127) || !b.length) {
            throw new sjcl.exception.corrupt("cbc ciphertext must be a positive multiple of the block size");
        }
        var i, w = sjcl.bitArray, bi, bo, output = [], xor = eb.misc.xor;
        d = d || [];
        for (i = 0; i < b.length; i += 4) {
            bi = b.slice(i, i + 4);
            bo = xor(c, a.decrypt(bi));
            output.splice(i, 0, bo[0], bo[1], bo[2], bo[3]);
            c = bi;
        }
        if (!noPad) {
            bi = output[i - 1] & 255;
            if (bi == 0 || bi > 16) {
                throw new sjcl.exception.corrupt("pkcs#5 padding corrupt"); //TODO: padding oracle?
            }
            bo = bi * 0x1010101;
            if (!w.equal(w.bitSlice([bo, bo, bo, bo], 0, bi << 3), w.bitSlice(output, (output.length << 5) - (bi << 3), output.length << 5))) {
                throw new sjcl.exception.corrupt("pkcs#5 padding corrupt"); //TODO: padding oracle?
            }
            return w.bitSlice(output, 0, (output.length << 5) - (bi << 3));
        } else {
            return output;
        }
    }
};

/**
 * Request builder.
 * @type {{}}
 */
eb.comm = {
    name: "comm",

    /**
     * General status constants.
     */
    status: {
        ERROR_CLASS_SECURITY:           0x2000,

        ERROR_CLASS_WRONGDATA:          0x8000,
        SW_INVALID_TLV_FORMAT:          0x8000 | 0x04c,
        SW_WRONG_PADDING:               0x8000 | 0x03d,
        SW_STAT_INVALID_APIKEY:         0x8000 | 0x068,
        SW_AUTHMETHOD_NOT_ALLOWED:      0x8000 | 0x0b9,

        ERROR_CLASS_SECURITY_USER:      0xa000,
        SW_HOTP_KEY_WRONG_LENGTH:       0xa000 | 0x056,
        SW_HOTP_TOO_MANY_FAILED_TRIES:  0xa000 | 0x066,
        SW_HOTP_WRONG_CODE:             0xa000 | 0x0b0,
        SW_HOTP_COUNTER_OVERFLOW:       0xa000 | 0x0b3,
        SW_AUTHMETHOD_UNKNOWN:          0xa000 | 0x0ba,
        SW_AUTH_TOO_MANY_FAILED_TRIES:  0xa000 | 0x0b1,
        SW_AUTH_MISMATCH_USER_ID:       0xa000 | 0x0b6,
        SW_PASSWD_TOO_MANY_FAILED_TRIES:0xa000 | 0x063,
        SW_PASSWD_INVALID_LENGTH:       0xa000 | 0x064,
        SW_WRONG_PASSWD:                0xa000 | 0x065,

        SW_STAT_OK:                     0x9000,
        ERROR_CLASS_ERR_CHECK_ERRORS_6f:0x6f00,

        PDATA_FAIL_CONNECTION:          0x1,
        PDATA_FAIL_RESPONSE_PARSING:    0x3,
        PDATA_FAIL_RESPONSE_FAILED:     0x2,
    },

    /**
     * Converts mangled nonce value to the original one in ProcessData response.
     * ProcessData response has nonce return value response_nonce[i] = request_nonce[i] + 0x1
     * @param nonce
     * @returns {*}
     */
    demangleNonce: function(nonce){
        var ba = sjcl.bitArray;
        var bl = ba.bitLength(nonce);
        if ((bl&7) != 0){
            throw new sjcl.exception.invalid("nonce has to be aligned to bytes");
        }

        var i, w = sjcl.bitArray, bp = 0, output = [], c;
        for (i = 0; bp + 32 <= bl; i += 1, bp += 32) {
            c = nonce.slice(i, i + 1)[0] - 0x01010101;
            output.splice(i, 0, c);
        }

        if (bp+32 == bl){
            return output;
        }

        var rbl = bl - (bp-32);
        var sub = 0x01010101 & (((1<<rbl)-1)<<(32-rbl));
        c = (nonce.slice(i, i + 1)[0] - sub) >>> rbl;
        output.splice(i, 0, c);
        return sjcl.bitArray.clamp(output, bl);
    },

    /**
     * Base class constructor.
     */
    base: function(){

    },

    /**
     * User object constructor
     */
    uo: function(uoid, encKey, macKey){
        var av = eb.misc.absorbValue;
        av(this, uoid, 'uoid');
        av(this, encKey, 'encKey');
        av(this, macKey, 'macKey');
    }
};
eb.comm.base.prototype = {
    /**
     * If set to true, request body building steps are logged.
     * @input
     */
    debuggingLog: false,

    /**
     * Aux logging function
     * @input
     */
    logger: null,

    _log:  function(x) {
        if (!this.debuggingLog){
            return;
        }

        if (console && console.log){
            console.log(x);
        }

        if (this.logger){
            this.logger(x);
        }
    }
};
eb.comm.uo.prototype = {
    /**
     * User object ID.
     */
    uoid: undefined,

    /**
     * Encryption communication key.
     */
    encKey: undefined,

    /**
     * MAC communication key.
     */
    macKey: undefined,
};

/**
 * Raw EB request builder.
 *
 * Data format before encryption:
 * buff = 0x1f | <UOID-4B> | <freshness-nonce-8B> | userdata
 *
 * Encryption
 * AES-256/CBC/PKCS7, IV = 0x00000000000000000000000000000000
 *
 * MAC
 * AES-256-CBC-MAC.
 *
 * encBlock = enc(buff)
 * result = encBlock || mac(encBlock)
 *
 * output = Packet0| _PLAINAES_ | <plain-data-length-4B> | <plaindata> | hexcode(result)
 *
 * @param nonce
 * @param aesKey
 * @param macKey
 * @param userObjectId
 * @param reqType
 */
eb.comm.processDataRequestBodyBuilder = function(nonce, aesKey, macKey, userObjectId, reqType){
    this.userObjectId = userObjectId || -1;
    this.nonce = nonce || "";
    this.aesKey = aesKey || "";
    this.macKey = macKey || "";
    this.reqType = reqType || "PLAINAES";
};
eb.comm.processDataRequestBodyBuilder.prototype = {
    /**
     * User object ID, integer type.
     * @input
     */
    userObjectId : -1,

    /**
     * AES communication encryption key, hexcoded string.
     * @input
     */
    aesKey: "",

    /**
     * AES MAC communication key, hexcoded string.
     * @input
     */
    macKey: "",

    /**
     * Freshness nonce / IV, hexcoded string.
     * @input
     */
    nonce: "",

    /**
     * Request type. PLAINAES by default.
     * @input
     */
    reqType: "",

    /**
     * If set to true, request body building steps are logged.
     * @input
     */
    debuggingLog: false,

    /**
     * Aux logging function
     * @input
     */
    logger: null,

    genNonce: function(){
        this.nonce = eb.misc.genHexNonce(16);
        return this.nonce;
    },

    /**
     * Builds EB request.
     *
     * @param plainData - bitArray of the plaintext data (will be MAC protected).
     * @param requestData - bitArray with userdata to perform operation on (will be encrypted, MAC protected)
     * @returns request body string.
     */
    build: function(plainData, requestData){
        this.nonce = this.nonce || eb.misc.genHexNonce(16);
        var h = sjcl.codec.hex;
        var ba = sjcl.bitArray;
        var pad = eb.padding.pkcs7;

        // Plain data is empty for now.
        var baPlain = plainData;
        var plainDataLength = ba.bitLength(baPlain)/8;

        // Input data flag
        var baBuff = h.toBits("1f");
        // User Object ID
        baBuff = ba.concat(baBuff, h.toBits(sprintf("%08x", eb.misc.inputToHexNum(this.userObjectId))));
        // Freshness nonce
        baBuff = ba.concat(baBuff, h.toBits(this.nonce));
        // User data
        baBuff = ba.concat(baBuff, requestData);
        // Add padding.
        baBuff = pad.pad(baBuff);
        this._log('ProcessData function input PDIN (0x1f | <UOID-4B> | <nonce-8B> | data | pkcs#7padding) : ' + h.fromBits(baBuff) + "; len: " + ba.bitLength(baBuff));

        var aesKeyBits = h.toBits(this.aesKey);
        var macKeyBits = h.toBits(this.macKey);

        var aes = new sjcl.cipher.aes(aesKeyBits);
        var aesMac = new sjcl.cipher.aes(macKeyBits);
        var hmac = new sjcl.misc.hmac_cbc(aesMac, 16, eb.padding.empty);

        // IV is null, nonce in the first block is kind of IV.
        var IV = h.toBits('00'.repeat(16));
        var encryptedData = sjcl.mode.cbc.encrypt(aes, baBuff, IV, [], true);
        this._log('Encrypted ProcessData input ENC(PDIN): ' + h.fromBits(encryptedData) + ", len=" + ba.bitLength(encryptedData));

        // include plain data in the MAC if non-empty.
        var hmacData = hmac.mac(encryptedData);
        this._log('MAC(ENC(PDIN)): ' + h.fromBits(hmacData));

        // Build the request block.
        var requestBase = sprintf('Packet0_%s_%04X%s%s%s',
            this.reqType,
            plainDataLength,
            h.fromBits(plainData),
            h.fromBits(encryptedData),
            h.fromBits(hmacData)
        );

        this._log('ProcessData request body: ' + requestBase);
        return requestBase;
    },

    _log:  function(x) {
        if (!this.debuggingLog){
            return;
        }

        if (console && console.log){
            console.log(x);
        }

        if (this.logger){
            this.logger(x);
        }
    }
};

/**
 * Base class for parsed raw EB response.
 */
eb.comm.response = function(){

};
eb.comm.response.prototype = {
    /**
     * Parsed status code. 0x9000 = OK.
     * @output
     */
    statusCode: 0,

    /**
     * Parsed status detail.
     * @output
     */
    statusDetail: "",

    /**
     * Function name extracted from the request.
     */
    function: "",

    /**
     * Raw result of the call.
     * Usually processed by child classes.
     */
    result: "",

    /**
     * Returns true if after parsing, code is OK.
     * @returns {boolean}
     */
    isCodeOk: function(){
        return this.statusCode == eb.comm.status.SW_STAT_OK;
    },

    toString: function(){
        return sprintf("Response{statusCode=0x%4X, statusDetail=[%s], userObjectId: 0x%08X, function: [%s], result: [%s]}",
            this.statusCode,
            this.statusDetail,
            eb.misc.inputToHexNum(this.userObjectID, true),
            this.function,
            JSON.stringify(this.result)
        );
    }
};

/**
 * Process data response.
 * Parsed from processData EB response.
 * @extends eb.comm.response
 */
eb.comm.processDataResponse = function(){

};
eb.comm.processDataResponse.inheritsFrom(eb.comm.response, {
    /**
     * Plain data parsed from the response.
     * Nor MACed neither encrypted.
     * @output
     */
    plainData: "",

    /**
     * Protected data parsed from the response.
     * Protected by MAC, encrypted in transit.
     * @output
     */
    protectedData: "",

    /**
     * USerObjectID parsed from the response.
     * Ingeter, 4B.
     */
    userObjectID: 0,

    /**
     * Nonce parsed from the RAW response.
     */
    nonce: "",

    /**
     * MAC value parsed from the message.
     * If macOk is true, it is same as computed MAC.
     */
    mac: "",

    /**
     * Computed MAC value for the message.
     */
    computedMac: "",

    /**
     * Returns true if MAC verification is OK.
     */
    isMacOk: function(){
        var ba = sjcl.bitArray;
        return this.mac
            && this.computedMac
            && ba.bitLength(this.mac) == 16*8
            && ba.bitLength(this.computedMac) == 16*8
            && ba.equal(this.mac, this.computedMac);
    },

    toString: function(){
        return sprintf("ProcessDataResponse{statusCode=0x%4X, statusDetail=[%s], userObjectId: 0x%08X, function: [%s], " +
            "nonce: [%s], protectedData: [%s], plainData: [%s], mac: [%s], computedMac: [%s], macOK: %d",
            this.statusCode,
            this.statusDetail,
            eb.misc.inputToHexNum(this.userObjectID, true),
            this.function,
            sjcl.codec.hex.fromBits(this.nonce),
            sjcl.codec.hex.fromBits(this.protectedData),
            sjcl.codec.hex.fromBits(this.plainData),
            sjcl.codec.hex.fromBits(this.mac),
            sjcl.codec.hex.fromBits(this.computedMac),
            this.isMacOk()
        );
    }
});

/**
 * EB Import public key.
 */
eb.comm.pubKey = function(){};
eb.comm.pubKey.prototype = {
    id: undefined,
    type: undefined,
    certificate: undefined,
    key: undefined,

    toString: function(){
        return sprintf("pubKey{id=0x%04X, type=[%s], certificate:[%s], key:[%s]",
            this.id,
            this.type,
            this.certificate ? sjcl.codec.hex.fromBits(this.certificate) : "null",
            this.key ? sjcl.codec.hex.fromBits(this.key) : "null"
        );
    }
};

/**
 * pubKey response.
 * @extends eb.comm.response
 */
eb.comm.pubKeyResponse = function(x){
    eb.misc.absorb(this, x);
};
eb.comm.pubKeyResponse.inheritsFrom(eb.comm.response, {
    /**
     * Plain data parsed from the response.
     * Nor MACed neither encrypted.
     * @output
     */
    keys: [],

    toString: function(){
        var stringKeys = [], index, len, c;
        for (index = 0, len =this.keys.length; index < len; ++index) {
            c = this.keys[index];
            if (c){
                stringKeys.push(c.toString());
            }
        }

        return sprintf("pubKeyResponse{statusCode=0x%4X, statusDetail=[%s], function: [%s], keys:[%s]",
            this.statusCode,
            this.statusDetail,
            this.function,
            stringKeys.join(", ")
        );
    }
});

/**
 * Raw EB Response parser.
 */
eb.comm.responseParser = function(){

};
eb.comm.responseParser.prototype = {
    /**
     * Parsed response
     * @output
     */
    response: null,

    /**
     * If set to true, response body parsing steps are logged to the console.
     * @input
     */
    debuggingLog: false,

    /**
     * Aux logging function
     * @input
     */
    logger: null,

    /**
     * User can define response parsing function here, called in the main parse body.
     * It is optional function callback, must return response.
     * @input
     */
    _responseParsingFunction: undefined,
    parsingFunction: function(x){
        this._responseParsingFunction = x;
        return this;
    },

    /**
     * Returns true if after parsing, code is OK.
     * @returns {boolean}
     */
    success: function(){
        return this.response.isCodeOk();
    },

    /**
     * Parses common JSON headers from the response, e.g., status, to the provided message.
     * @param resp
     * @param data
     * @returns {eb.comm.response}
     */
    parseCommonHeaders: function(resp, data){
        if (!data || !data.status || !data.function){
            throw new sjcl.exception.invalid("response data invalid");
        }

        // Build new response message.
        resp.statusCode = parseInt(data.status, 16);
        resp.statusDetail = data.statusdetail || "";
        resp.function = data.function;
        resp.result = data.result;
        return resp;
    },

    /**
     * Parse EB response
     *
     * @param data - json response
     * @param resp - response object to put data to.
     * @param options
     * @returns request unwrapped response.
     */
    parse: function(data, resp, options){
        resp = resp || this.response;
        resp = resp || new eb.comm.response();
        this.response = resp;
        this.parseCommonHeaders(resp, data);

        // Build new response message.
        if (!this.success()){
            this._log("Error in processing, status: " + data.status + ", message: " + resp.statusDetail);
        }

        // If parsing function is already set, use it.
        if (this._responseParsingFunction){
            this.response = this._responseParsingFunction(data, resp, this);
            return this.response;
        }

        return resp;
    },

    _log:  function(x) {
        if (!this.debuggingLog){
            return;
        }

        if (console && console.log){
            console.log(x);
        }

        if (this.logger){
            this.logger(x);
        }
    }
};

/**
 * Parser parsing namely ProcessData response.
 * Data returned is encoded in the particular form, encrypted and MACed.
 * This response parser unwraps protected response.
 *
 * @param aesKey
 * @param macKey
 * @extends eb.comm.responseParser
 */
eb.comm.processDataResponseParser = function(aesKey, macKey){
    this.aesKey = aesKey || "";
    this.macKey = macKey || "";
};
eb.comm.processDataResponseParser.inheritsFrom(eb.comm.responseParser, {
    /**
     * Parsed user object ID, integer type.
     * @input
     */
    userObjectId : -1,

    /**
     * AES communication encryption key, hexcoded string.
     * @input
     */
    aesKey: "",

    /**
     * AES MAC communication key, hexcoded string.
     * @input
     */
    macKey: "",

    /**
     * Parse EB response
     *
     * @param data - json response
     * @param resp - response object to put data to.
     * @param options
     * @returns request unwrapped response.
     */
    parse: function(data, resp, options){
        resp = resp || this.response;
        resp = resp || new eb.comm.processDataResponse();
        this.response = resp;

        this.parseCommonHeaders(resp, data);
        if (!this.success()){
            this._log("Error in processing, status: " + data.status + ", message: " + resp.statusDetail);
            return resp;
        }

        // Shortcuts.
        var h = sjcl.codec.hex;
        var ba = sjcl.bitArray;

        // Build new response message.
        var resultBuffer = resp.result;
        var baResult = h.toBits(resultBuffer.substring(0, resultBuffer.indexOf("_")));
        var plainLen = ba.extract(baResult, 0, 2*8);
        var plainBits = ba.bitSlice(baResult, 2*8, 2*8+plainLen*8);
        var protectedBits = ba.bitSlice(baResult, 2*8+plainLen*8);
        var protectedBitsBl = ba.bitLength(protectedBits);

        // Decrypt and verify
        var aesKeyBits = h.toBits(this.aesKey);
        var macKeyBits = h.toBits(this.macKey);
        var aes = new sjcl.cipher.aes(aesKeyBits);
        var aesMac = new sjcl.cipher.aes(macKeyBits);
        var hmac = new sjcl.misc.hmac_cbc(aesMac, 16, eb.padding.empty);

        // Verify MAC.
        var macTagOffset = protectedBitsBl - 16*8;
        var dataToMac = ba.bitSlice(protectedBits, 0, macTagOffset);
        if ((ba.bitLength(dataToMac) & 127) != 0){
            throw new sjcl.exception.corrupt("Padding size invalid");
        }

        resp.mac = ba.bitSlice(protectedBits, macTagOffset);
        if (ba.bitLength(resp.mac) != 16*8){
            throw new sjcl.exception.corrupt("MAC corrupted");
        }

        resp.computedMac = hmac.mac(dataToMac);
        if (!resp.mac || !ba.equal(resp.mac, resp.computedMac)){
            throw new sjcl.exception.corrupt("Padding is not valid"); //TODO: padding oracle?
        }

        // Decrypt.
        var dataToDecrypt = ba.bitSlice(protectedBits, 0, macTagOffset);
        if ((ba.bitLength(dataToDecrypt) & 127) != 0){
            throw new sjcl.exception.corrupt("Ciphertext block invalid");
        }

        // IV is null, nonce in the first block is kind of IV.
        var IV = h.toBits('00'.repeat(16));
        var decryptedData = sjcl.mode.cbc.decrypt(aes, dataToDecrypt, IV, [], false);
        this._log("decryptedData: " + h.fromBits(decryptedData) + ", len=" + ba.bitLength(decryptedData));

        // Check the flag.
        var responseFlag = ba.extract(decryptedData, 0, 8);
        if (responseFlag != 0xf1){
            throw new sjcl.exception.corrupt("Given data packet is not a response (flag mismatch)");
        }

        // Get user object.
        resp.userObjectID = ba.extract32(decryptedData, 8);

        // Get nonce, mangled.
        var returnedMangledNonce = ba.bitSlice(decryptedData, 5*8, 5*8+8*8);
        resp.nonce = eb.comm.demangleNonce(returnedMangledNonce);

        // Response = plainData + decryptedData.
        resp.protectedData = ba.bitSlice(decryptedData, 5*8+8*8);
        resp.plainData = plainBits;
        this._log("responseData: " + h.fromBits(resp.protectedData));

        return resp;
    }
});

/**
 * Simple connector to the EB interface.
 * Configurable for https/http GET/POST
 */
eb.comm.connector = function(){

};
eb.comm.connector.prototype = {
    objName: "connector",
    /**
     * Method to do REST request with. GET or POST are allowed.
     * @input
     */
    requestMethod: "POST",

    /**
     * Scheme used to contact remote API.
     * @input
     * @default https
     */
    requestScheme: "https",

    /**
     * Request timeout in milliseconds.
     * @input
     * @default 30000
     */
    requestTimeout: 30000,

    /**
     * Endpoint where EB API listens
     * @input
     */
    remoteEndpoint: "dragonfly.smarthsm.net",

    /**
     * Port of the remote endpoint
     * @input
     * @default 11180
     */
    remotePort: 11180,

    /**
     * Ajax call settings. User can modify default behavior by specifying settings here.
     * @input
     */
    ajaxSettings: {},

    /**
     * If set to true, request body building steps are logged.
     * @input
     */
    debuggingLog: false,

    /**
     * Aux logging function
     * @input
     */
    logger: null,

    /**
     * Request start time. Measure how long it took.
     * @output
     */
    requestTime: 0,

    /**
     * Raw request generated by the build call.
     * e.g., transmitted in the GET query method parameters / URL.
     */
    reqHeader: undefined,

    /**
     * Body part of the request.
     * e.g., transmitted in body of the HTTP message.
     */
    reqBody: undefined,

    /**
     * Response generated by response array.
     * @output
     */
    response: undefined,

    /**
     * RAW response from the server.
     * @output
     */
    rawResponse: undefined,

    /**
     * Response parser used to parse the response.
     * If not defined before calling doRequest method, default response parser is created.
     */
    responseParser: undefined,

    /**
     * Socket equivalent request, for debugging.
     * Generated when building the request.
     * @private
     */
    _socketRequest: "",

    _doneCallback: function(response, requestObj, data){},
    _failCallback: function(failType, data){},
    _alwaysCallback: function(requestObj, data){},

    done: function(x){
        this._doneCallback = x;
        return this;
    },

    fail: function(x){
        this._failCallback = x;
        return this;
    },

    always: function(x){
        this._alwaysCallback = x;
        return this;
    },

    /**
     * Returns if the EB returned with success.
     * Note: Data still may have invalid MAC.
     * @returns {*|boolean}
     */
    wasSuccessful: function(){
        return this.responseParser.success();
    },

    /**
     * Process configuration from the config object.
     * @param configObject java object with the configuration.
     */
    configure: function(configObject){
        if (!configObject){
            this._log("Invalid config object");
            return;
        }

        // Advanced connection settings.
        var ak = eb.misc.absorbKey;
        ak(this, configObject, "remoteEndpoint");
        ak(this, configObject, "remotePort");
        ak(this, configObject, "requestMethod");
        ak(this, configObject, "requestScheme");
        ak(this, configObject, "requestTimeout");
        ak(this, configObject, "debuggingLog");
        ak(this, configObject, "logger");
        ak(this, configObject, "responseParser");
        ak(this, configObject, "reqHeader");
        ak(this, configObject, "reqBody");
    },

    /**
     * Initializes state and builds request
     * @param requestHeader
     * @param requestBody
     */
    build: function(requestHeader, requestBody){
        if (requestHeader) {
            this.reqHeader = requestHeader;
        }

        if (requestBody) {
            this.reqBody = requestBody;
        }
    },

    /**
     * Builds EB request.
     *
     * @param requestHeader
     * @param requestBody
     * @returns request body string.
     */
    doRequest: function(requestHeader, requestBody){
        if (!this.reqBody){
            this.build(requestHeader, requestBody);
        }

        var url = this.getApiUrl();
        var apiData = this.getApiRequestData();
        var ajaxSettings = {
            url: url,
            type: this.requestMethod,
            dataType: 'json',
            timeout: this.requestTimeout,
            data: this.requestMethod == "POST" ? JSON.stringify(apiData) : null
        };

        // Extend ajax settings with user provided settings.
        $.extend(ajaxSettings, this.ajaxSettings || {});
        var ebc = this;

        // Do the remote call
        this._log("Sending remote request...");
        this.requestTime = new Date().getTime();
        $.ajax(ajaxSettings)
            .done(function (data, textStatus, jqXHR) {
                ebc._requestFinished();
                ebc._log("Response status: " + textStatus);
                ebc._log("Raw response: " + JSON.stringify(data));

                // Process AJAX success. By default, response parsing is done. Subclass may modify this behavior.
                ebc.processAnswer(data, textStatus, jqXHR);

            }).fail(function (jqXHR, textStatus, errorThrown) {
            ebc._requestFinished();
            ebc._log("Error: " + sprintf("Error: status=[%d], responseText: [%s], error: [%s], status: [%s] misc: %s",
                    jqXHR.status, jqXHR.responseText, errorThrown, textStatus, JSON.stringify(jqXHR)));

            // Process AJAX fail, subclass can modify behavior, hook something.
            ebc.processFail(jqXHR, textStatus, errorThrown);

        }).always(function (data, textStatus, jqXHR) {
            // Process AJAX always, subclass can modify behavior, hook something.
            ebc.processAlways(data, textStatus, jqXHR);

        });
    },

    /**
     * Request finished, measure time.
     * @private
     */
    _requestFinished: function(){
        this.requestTime = (new Date().getTime() - this.requestTime);
        this._log("Request finished in " + this.requestTime + " ms");
    },

    /**
     * Processing response from the server.
     *
     * @param data
     * @param textStatus
     * @param jqXHR
     */
    processAnswer: function(data, textStatus, jqXHR){
        this.rawResponse = data;
        try {
            var responseParser = this.getResponseParser();
            this.response = this.getResponseObject();
            this.response = responseParser.parse(data, this.response);

            if (responseParser.success()) {
                this._log("Processing complete, response: " + this.response.toString());
                if (this._doneCallback){
                    this._doneCallback(this.response, this, {
                        'jqXHR':jqXHR,
                        'textStatus':textStatus,
                        'response':this.response,
                        'requestObj':this
                    });
                }

            } else {
                this._log("Failure, status: " + this.response.toString());
                if (this._failCallback){
                    this._failCallback(eb.comm.status.PDATA_FAIL_RESPONSE_FAILED, {
                        'jqXHR':jqXHR,
                        'textStatus':textStatus,
                        'response':this.response,
                        'requestObj':this
                    });
                }
            }

        } catch(e){
            this._log("Exception when processing the response: " + e);
            if (this._failCallback){
                this._failCallback(eb.comm.status.PDATA_FAIL_RESPONSE_PARSING, {
                    'jqXHR':jqXHR,
                    'textStatus':textStatus,
                    'requestObj':this,
                    'parseException':e
                });
            }

            throw e;
        }
    },

    /**
     * To be overriden.
     * Called on AJAX fail.
     *
     * @param jqXHR
     * @param textStatus
     * @param errorThrown
     */
    processFail: function(jqXHR, textStatus, errorThrown){
        if (this._failCallback) {
            this._failCallback(eb.comm.status.PDATA_FAIL_CONNECTION, {
                'jqXHR':jqXHR,
                'textStatus':textStatus,
                'errorThrown':errorThrown,
                'requestObj': this
            });
        }
    },

    /**
     * To be overriden.
     * Called on AJAX always.
     *
     * @param data
     * @param textStatus
     * @param jqXHR
     */
    processAlways: function(data, textStatus, jqXHR){
        if (this._alwaysCallback) {
            this._alwaysCallback(this, {
                'responseRawData':data,
                'textStatus':textStatus,
                'jqXHR':jqXHR,
                'requestObj': this
            });
        }
    },

    /**
     * Returns remote API URL to query with Ajax.
     * According to current request settings.
     * Note: Request has to be built when calling this function.
     *
     * @returns {*}
     */
    getApiUrl: function(){
        return sprintf("%s://%s:%d/",
            this.requestScheme,
            this.remoteEndpoint,
            this.remotePort);
    },

    /**
     * Returns Ajax request data.
     * According to current request settings.
     * Note: Request has to be built when calling this function.
     *
     * @returns {*}
     */
    getApiRequestData: function(){
        return this.reqBody;
    },

    /**
     * Returns response parser when is needed. May lazily initialize parser.
     * Override point.
     *
     * @returns {*}
     */
    getResponseParser: function(){
        this.responseParser = new eb.comm.responseParser();
        this.responseParser.debuggingLog = true;
        this.responseParser.logger = this.logger;
        return this.responseParser;
    },

    /**
     * Returns respone object to be used by the response parser.
     * Enables to specify a subclass of the original response class.
     */
    getResponseObject: function(){
        return new eb.comm.response();
    },

    /**
     * Returns raw EB request for raw socket transport method.
     * For debugging & verification.
     *
     * @returns {string}
     */
    getSocketRequest: function(){
        this._socketRequest = {};
        $.extend(true, this._socketRequest, this.reqHeader || {});
        $.extend(true, this._socketRequest, this.reqBody || {});
        return this._socketRequest;
    },

    /**
     * Logger wrapper. Allowing to log messages both to console and provided logger.
     * @param x message to log.
     * @private
     */
    _log:  function(x) {
        if (!this.debuggingLog){
            return;
        }

        if (console && console.log){
            console.log(x);
        }

        if (this.logger){
            this.logger(x);
        }
    }
};

/**
 * API request using the connector.
 * Standard request with
 *   - API version,
 *   - API Key,
 *   - API lower 4 bytes identifier (e.g., user object id),
 *   - call function,
 *   - nonce
 *
 * @param apiKey
 * @param apiKeyLow4Bytes
 */
eb.comm.apiRequest = function(apiKey, apiKeyLow4Bytes){
    this.apiKey = apiKey;
    this.apiKeyLow4Bytes = apiKeyLow4Bytes;
};
eb.comm.apiRequest.inheritsFrom(eb.comm.connector, {
    objName: "apiRequest",

    /**
     * Function to call
     * @input
     * @default ProcessData
     */
    callFunction: "ProcessData",

    /**
     * User API key
     * @input
     */
    apiKey: undefined,

    /**
     * Lower 4 API bytes to use for api token.
     * For process data this may be UseObjectId.
     * @input
     */
    apiKeyLow4Bytes: undefined,

    /**
     * Version of EB API.
     * @input
     * @default 1.0
     */
    apiVersion: "1.0",

    /**
     * Nonce generated for the request.
     * @input
     * @output
     */
    nonce: undefined,

    /**
     * Composite API key for the request.
     * Generated before request is sent.
     * @private
     */
    _apiKeyReq: "",

    /**
     * Builds API key token.
     * Consists of apiKey and low4B identifier.
     * Can be specified by parameters or currently set values are set.
     * Result is returned and set to the property.
     *
     * @param apiKey
     * @param apiLow4b  integer or hex-coded string.
     */
    buildApiBlock: function(apiKey, apiLow4b){
        apiKey = apiKey || this.apiKey;
        apiLow4b = apiLow4b || this.apiKeyLow4Bytes;
        this._apiKeyReq = sprintf("%s%010x", apiKey, eb.misc.inputToHexNum(apiLow4b));
        return this._apiKeyReq;
    },

    /**
     * Builds standard request header from existing fields.
     */
    buildReqHeader: function() {
        this.reqHeader = {
            objectid:this._apiKeyReq,
            function:this.callFunction,
            nonce:this.getNonce(),
            version:this.apiVersion
        };
        return this.reqHeader;
    },

    /**
     * Returns currently set nonce.
     * Generates a new one if is undefined.
     * @returns {*}
     */
    getNonce: function(){
        if (!this.nonce){
            return this.genNonce();
        }

        return this.nonce;
    },

    /**
     * Generates new nonce, sets it as a current nonce for the request.
     * @returns {string|*|string}
     */
    genNonce: function(){
        this.nonce = eb.misc.genHexNonce(16);
        return this.nonce;
    },

    /**
     * Process configuration from the config object.
     * @param configObject java object with the configuration.
     */
    configure: function(configObject){
        if (!configObject){
            this._log("Invalid config object");
            return;
        }

        // Configure with parent.
        eb.comm.apiRequest.superclass.configure.call(this, configObject);

        // Configure this.
        var ak = eb.misc.absorbKey;
        ak(this, configObject, "callFunction");
        ak(this, configObject, "apiKey");
        ak(this, configObject, "apiKeyLow4Bytes");
        ak(this, configObject, "nonce");
    },

    /**
     * Returns remote API URL to query with Ajax.
     * According to current request settings.
     * Note: Request has to be built when calling this function.
     *
     * @returns {*}
     */
    getApiUrl: function(){
        if (this.requestMethod == "POST" || (this.requestMethod == "GET" && !this.reqBody)){
            return sprintf("%s://%s:%d/%s/%s/%s/%s",
                this.requestScheme,
                this.remoteEndpoint,
                this.remotePort,
                this.apiVersion,
                this._apiKeyReq,
                this.callFunction,
                this.getNonce());

        } else if (this.requestMethod == "GET"){
            return sprintf("%s://%s:%d/%s/%s/%s/%s%s",
                this.requestScheme,
                this.remoteEndpoint,
                this.remotePort,
                this.apiVersion,
                this._apiKeyReq,
                this.callFunction,
                this.getNonce(),
                this.reqBody !== undefined ? ("/" + JSON.stringify(this.reqBody)) : "");

        } else {
            throw new eb.exception.invalid("Invalid configuration, unknown method: " + this.requestMethod);
        }
    },

    /**
     * Returns Ajax request data.
     * According to current request settings.
     * Note: Request has to be built when calling this function.
     *
     * @returns {*}
     */
    getApiRequestData: function(){
        if (this.requestMethod == "POST") {
            return this.reqBody;
        } else {
            return {};
        }
    },

    /**
     * Initializes state and builds request
     * @param requestHeader
     * @param requestBody
     */
    build: function(requestHeader, requestBody){
        if (requestHeader.apiKey && requestHeader.apiKeyLow4Bytes){
            this.buildApiBlock(requestHeader.apiKey, requestHeader.apiKeyLow4Bytes);
        } else {
            this.buildApiBlock();
        }

        if (requestBody){
            this.reqBody = requestBody;
        }

        if (requestHeader){
            this.reqHeader = requestHeader;
        }

        this.buildReqHeader();
    },
});

/**
 * Process data request to the EB.
 * @param apiKey
 * @param aesKey
 * @param macKey
 * @param userObjectId
 */
eb.comm.processData = function(apiKey, aesKey, macKey, userObjectId){
    this.apiKey = apiKey || "";
    this.aesKey = aesKey || "";
    this.macKey = macKey || "";
    this.userObjectId = userObjectId || -1;
    this.callFunction = "ProcessData";
};
eb.comm.processData.inheritsFrom(eb.comm.apiRequest, {
    /**
     * User object ID to perform operation with, integer type.
     * @input
     */
    userObjectId : -1,

    /**
     * AES communication encryption key, hexcoded string.
     * @input
     */
    aesKey: "",

    /**
     * AES MAC communication key, hexcoded string.
     * @input
     */
    macKey: "",

    /**
     * Type of the data request.
     * PLAINAES for AES keys, RSA2048 for RSA-2048 keys.
     *
     * @input
     * @default PLAINAES
     */
    callRequestType: "PLAINAES",

    /**
     * Request builder used to build the request.
     * @output
     */
    processDataRequestBodyBuilder: null,

    /**
     * Request block generated by request builder.
     * @private
     */
    _requestBlock: "",

    /**
     * Process configuration from the config object.
     * @param configObject java object with the configuration.
     */
    configure: function(configObject){
        if (!configObject){
            this._log("Invalid config object");
            return;
        }

        var toConfig = configObject;
        if ("userObjectId" in configObject){
            toConfig = $.extend(true, toConfig, {apiKeyLow4Bytes : configObject.userObjectId});
        }

        // Configure with parent.
        eb.comm.processData.superclass.configure.call(this, toConfig);

        // Configure this.
        var ak = eb.misc.absorbKey;
        ak(this, configObject, "aesKey");
        ak(this, configObject, "macKey");
        ak(this, configObject, "userObjectId");
        ak(this, configObject, "callRequestType");
    },

    /**
     * Initializes state and builds request
     * @param plainData
     * @param requestData
     */
    build: function(plainData, requestData){
        this._log("Building request body");

        // Request header data.
        this.buildApiBlock(this.apiKey, this.userObjectId);
        this.buildReqHeader();

        // Build a new EB request.
        this.processDataRequestBodyBuilder = new eb.comm.processDataRequestBodyBuilder();
        this.processDataRequestBodyBuilder.aesKey = this.aesKey;
        this.processDataRequestBodyBuilder.macKey = this.macKey;
        this.processDataRequestBodyBuilder.userObjectId = this.userObjectId;
        this.processDataRequestBodyBuilder.reqType = this.callRequestType;
        this.processDataRequestBodyBuilder.debuggingLog = this.debuggingLog;
        this.processDataRequestBodyBuilder.logger = this.logger;
        this.processDataRequestBodyBuilder.nonce = this.getNonce();

        this._requestBlock = this.processDataRequestBodyBuilder.build(plainData, requestData);
        this.reqBody = {data : this._requestBlock};

        var nonce = this.getNonce();
        var url = this.getApiUrl();
        var apiData = this.getApiRequestData();

        this._log("Nonce: " + nonce);
        this._log("URL: " + url + ", method: " + this.requestMethod);
        this._log("UserData: " + JSON.stringify(apiData));
        this._log("SocketReq: " + JSON.stringify(this.getSocketRequest()));
    },

    /**
     * Builds EB request.
     *
     * @param requestHeader
     * @param requestBody
     * @returns request body string.
     */
    doRequest: function(requestHeader, requestBody){
        if (!this.reqBody){
            this.build(requestHeader, requestBody);
        }

        eb.comm.processData.superclass.doRequest.call(this);
    },

    /**
     * Returns remote API URL to query with Ajax.
     * According to current request settings.
     * Note: Request has to be built when calling this function.
     *
     * @returns {*}
     */
    getApiUrl: function(){
        if (this.requestMethod == "POST"){
            return sprintf("%s://%s:%d/%s/%s/%s/%s",
                this.requestScheme,
                this.remoteEndpoint,
                this.remotePort,
                this.apiVersion,
                this._apiKeyReq,
                this.callFunction,
                this.getNonce());

        } else if (this.requestMethod == "GET"){
            return sprintf("%s://%s:%d/%s/%s/%s/%s/%s",
                this.requestScheme,
                this.remoteEndpoint,
                this.remotePort,
                this.apiVersion,
                this._apiKeyReq,
                this.callFunction,
                this.getNonce(),
                this.reqBody.data);

        } else {
            throw new eb.exception.invalid("Invalid configuration, unknown method: " + this.requestMethod);
        }
    },

    /**
     * Returns Ajax request data.
     * According to current request settings.
     * Note: Request has to be built when calling this function.
     *
     * @returns {*}
     */
    getApiRequestData: function(){
        if (this.requestMethod == "POST") {
            return this.reqBody;
        } else {
            return {};
        }
    },

    /**
     * Returns response parser when is needed. May lazily initialize parser.
     * Override point.
     *
     * @returns {*}
     */
    getResponseParser: function(){
        this.responseParser = new eb.comm.processDataResponseParser();
        this.responseParser.debuggingLog = true;
        this.responseParser.logger = this.logger;
        this.responseParser.aesKey = this.aesKey;
        this.responseParser.macKey = this.macKey;
        return this.responseParser;
    }
});

/**
 * Request obtaining import public keys.
 */
eb.comm.getPubKey = function(){
    this.callFunction = "GetImportPublicKey";
};
eb.comm.getPubKey.inheritsFrom(eb.comm.apiRequest, {
    objName: "getPubKey",

    /**
     * Initializes state and builds request
     */
    build: function(){
        this._log("Building request body");

        // Request header data.
        this.buildApiBlock(this.apiKey, this.userObjectId);
        this.buildReqHeader();
        this.reqBody = {};

        var nonce = this.getNonce();
        var url = this.getApiUrl();
        this._log("Nonce generated: " + nonce);
        this._log("URL: " + url + ", method: " + this.requestMethod);
        this._log("SocketReq: " + JSON.stringify(this.getSocketRequest()));
    },

    /**
     * Returns response parser when is needed. May lazily initialize parser.
     * Override point.
     *
     * @returns {*}
     */
    getResponseParser: function(){
        // Generic parser with given parsing function.
        var pubKeyParser = new eb.comm.responseParser();
        pubKeyParser.parsingFunction(function(data, resp, parser){
            var response = new eb.comm.pubKeyResponse(resp);

            /**
             * Response:
             * {"function":"GetImportPublicKey","result":[
             * {"certificate":null,"id":263,"type":"rsa","key":"81 00 03 01 00 01 82 01 00 e1 e0 6b 76 f9 7b cd 82 7c 98 cc 3b 41 a8 50 40 cc dc 61 cf 72 58 14 fd b9 e9 5f 53 06 29 12 e9 39 b1 3c f1 ce 27 d0 7b 44 78 57 7a 20 9c ff db de a2 90 29 19 c0 87 08 8f 85 d5 ed 1d 0b 0c dc ef d8 23 b6 49 71 4f 69 95 31 d9 b8 10 08 af 63 5e a9 79 67 82 fe 3c 40 3c 0e 5d e2 15 58 78 06 f3 0e 16 09 4d a0 16 05 89 e9 80 1c ba f4 0e 63 fd 2d 72 cb 85 cb 7f c1 9a 37 7b 0f a9 2e 7d 90 8e 6a 69 aa bc 4c 5b a2 2d 32 e5 58 7e 0e d8 12 b4 c1 62 66 84 98 fd e5 54 08 93 c1 c0 88 41 51 60 93 93 d8 cc cd ee 3e eb 88 ae 91 24 32 16 b2 26 92 73 f9 a5 23 b9 5c cf e5 b1 f9 e5 4f d2 4f 73 77 a2 ab d7 c6 43 9e c4 60 97 c4 70 1e 58 c2 49 33 02 2d 43 8b 77 67 3c 30 0e a6 81 e4 73 d2 46 18 f9 79 40 3d a6 79 dd 5c 3c e0 b7 4c 16 a9 5c 96 47 40 7c 2c dc 11 3b 92 75 44 ec d8 c6 95 "},
             * {"certificate":null,"id":264,"type":"rsa","key":"81 00 03 01 00 01 82 01 00 e1 e0 6b 76 f9 7b cd 82 7c 98 cc 3b 41 a8 50 40 cc dc 61 cf 72 58 14 fd b9 e9 5f 53 06 29 12 e9 39 b1 3c f1 ce 27 d0 7b 44 78 57 7a 20 9c ff db de a2 90 29 19 c0 87 08 8f 85 d5 ed 1d 0b 0c dc ef d8 23 b6 49 71 4f 69 95 31 d9 b8 10 08 af 63 5e a9 79 67 82 fe 3c 40 3c 0e 5d e2 15 58 78 06 f3 0e 16 09 4d a0 16 05 89 e9 80 1c ba f4 0e 63 fd 2d 72 cb 85 cb 7f c1 9a 37 7b 0f a9 2e 7d 90 8e 6a 69 aa bc 4c 5b a2 2d 32 e5 58 7e 0e d8 12 b4 c1 62 66 84 98 fd e5 54 08 93 c1 c0 88 41 51 60 93 93 d8 cc cd ee 3e eb 88 ae 91 24 32 16 b2 26 92 73 f9 a5 23 b9 5c cf e5 b1 f9 e5 4f d2 4f 73 77 a2 ab d7 c6 43 9e c4 60 97 c4 70 1e 58 c2 49 33 02 2d 43 8b 77 67 3c 30 0e a6 81 e4 73 d2 46 18 f9 79 40 3d a6 79 dd 5c 3c e0 b7 4c 16 a9 5c 96 47 40 7c 2c dc 11 3b 92 75 44 ec d8 c6 95 "}]
             * ,"status":"9000","statusdetail":"(OK)SW_STAT_OK","version":"1.0"}
             */
            if (!data.result || !data.result.length) {
                parser._log("Result is not an array");
                return;
            }

            response.keys = [];
            var index, len, cur, cKey, ok;
            for (index = 0, len = data.result.length; index < len; ++index) {
                cur = data.result[index];
                cKey = new eb.comm.pubKey();
                if (!("id" in cur && "key" in cur)){
                    continue;
                }

                cKey.id = cur.id;
                cKey.type = cur.type;
                if ("certificate" in cur && cur.certificate){
                    var noSpaceCrt = cur.certificate.replace(/\s+/g,'');
                    cKey.certificate = sjcl.codec.hex.toBits(noSpaceCrt);
                }

                if ("key" in cur && cur.key){
                    var noSpaceKey = cur.key.replace(/\s+/g,'');
                    cKey.key = sjcl.codec.hex.toBits(noSpaceKey);
                }

                response.keys.push(cKey);
            }
            return response;
        });

        this.responseParser = pubKeyParser;
        return this.responseParser;
    }
});

/**
 * HOTP feature.
 */
eb.comm.hotp = {
    // Template for generation of new user context.
    // USER_AUTH_CTX structure: version 1B | user_id 8B | flags 4B | #total_failed_tries 1B | #max_total_failed_tries 1B | TLV_auth_method1 | ... | TLV_auth_method_n |
    //                   VR    USER-ID-8B     flags   #e #m
    ctxTemplateUsr:     '01         %s       00000000 00 04',

    // HOTP method:      tt  len cf mf HOTP 8B counter  ct  Dg  Ln Secret - template
    ctxTemplateHotp:    '3f 001d 00 03 0000000000000000 02 %02x 10 11223344556677881122334455667788',

    // Passwd method:    tt len  cf mf hl   password hash
    ctxTemplatePasswd:  '40 %04x 00 03 %02x %s',

    // VR - version
    // #e - total failed entries
    // #m - max total failed entries
    // tt - auth method type. 0x3f = HOTP, 0x40 = password auth.
    // len - overall auth record length
    // Dg - digits
    // Ln - secret length
    // cf - current fails
    // mf - maximum number of fails
    // hl - hash length

    // Constants
    TLV_TYPE_USERAUTHCONTEXT: 0xa3,
    TLV_TYPE_NEWAUTHCONTEXT: 0xa8,
    TLV_TYPE_UPDATEAUTHCONTEXT: 0xa7,
    TLV_TYPE_HOTPCODE: 0xa5,
    TLV_TYPE_PASSWORDHASH: 0xa4,
    USERAUTHCTX_MAIN_USERID_LENGTH: 8,
    USERAUTH_FLAG_HOTP: 0x0001,
    USER_AUTH_TYPE_HOTP: 63,
    USERAUTH_FLAG_PASSWD: 0x0002,
    USER_AUTH_TYPE_PASSWD: 64,
    USERAUTH_FLAG_GLOBALTRIES: 0x0004,
    USER_AUTH_TYPE_GLOBALTRIES: 62,

    HOTP_DIGITS_DEFAULT: 6,

    /**
     * Builds generalized context template from the options.
     * May contain two authentization methods at the moment, HOTP, Password.
     * @param options
     *      userId:  user ID aditional entropy. By default 0000000000000001
     *      methods: flags for methods to include in context. USERAUTH_FLAG_HOTP, USERAUTH_FLAG_PASSWD.
     *      hotp: {digits}: hotp digits in the template. HOTP code length.
     *      passwd: {hash}: password hash used for authentication.
     */
    getCtxTemplate: function(options){
        var defaults = {
            userId: eb.comm.hotp.userIdToHex("01"),
            methods: eb.comm.hotp.USERAUTH_FLAG_HOTP,
            hotp:{
                digits: eb.comm.hotp.HOTP_DIGITS_DEFAULT
            },
            passwd:{
                hash: undefined
            }
        };

        options = $.extend(true, defaults, options || {});
        var useHotp = options && ((options.methods & eb.comm.hotp.USERAUTH_FLAG_HOTP) > 0);
        var usePass = options && ((options.methods & eb.comm.hotp.USERAUTH_FLAG_PASSWD) > 0);

        var userId = eb.comm.hotp.userIdToHex(options && options.userId);

        // Build base context.
        var ctx = sprintf(this.ctxTemplateUsr, userId);

        // Add HOTP method, if desired.
        if (useHotp){
            var digits = options && options.hotp && options.hotp.digits;
            ctx += sprintf(this.ctxTemplateHotp, digits);
        }

        // Add Password method, if desired.
        if (usePass){
            var hash = options && options.passwd && options.passwd.hash;
            if (hash === undefined || hash.length == 0) {
                throw new eb.exception.invalid("Password auth method specified, empty hash");
            }

            hash = eb.misc.padHexToEven(eb.misc.inputToHex(hash));
            var hashLen = hash.length / 2;
            var totalLen = 3 + hashLen;

            ctx += sprintf(this.ctxTemplatePasswd, totalLen, hashLen, hash);
        }

        return sjcl.codec.hex.toBits(ctx.replace(/ /g,''));
    },

    /**
     * Encrypts HOTP CTX template with random key & MACs with random key to obtain encrypted
     * template blob. Required for new user HOTPCTX init.
     *
     * @param tpl
     * @returns {*}
     */
    prepareUserContext: function(tpl){
        var randomEncKey = sjcl.random.randomWords(8);
        var randomMacKey = sjcl.random.randomWords(8);

        var aes = new sjcl.cipher.aes(randomEncKey);
        var aesMac = new sjcl.cipher.aes(randomMacKey);
        var hmac = new sjcl.misc.hmac_cbc(aesMac, 16, eb.padding.empty);

        // Padding of the TPL.
        tpl = eb.padding.pkcs7.pad(tpl);

        // IV is null, nonce in the first block is kind of IV.
        var IV = sjcl.codec.hex.toBits('00'.repeat(16));
        var encryptedData = sjcl.mode.cbc.encrypt(aes, tpl, IV, [], true);
        var hmacData = hmac.mac(encryptedData);

        return sjcl.bitArray.concat(encryptedData, hmacData);
    },

    /**
     * Converts HOTP number given as string to hex-coded array.
     * Used when authenticating via HOTP code.
     *
     * Warning: does not perform radix change. 12345678 -> d2h(12)|d2h(34)|d2h(56)|d2h(78) = 0c22384e
     * d2h(12345678) = 0BC614E
     *
     * @param hotpCode numeric authentication code coded as string in decimal.
     * @param length HOTP code length. Default = 8. Usually 6,8,10,12
     * @ref: intToExpandedShortByteArray()
     */
    hotpCodeToHexCoded: function(hotpCode, length){
        length = length || eb.comm.hotp.HOTP_DIGITS_DEFAULT;
        var inputCode = "000000000000000000000000000" + hotpCode;
        var i,idx,cur,curNum,codeLength = inputCode.length;
        var result = "";
        for(i=0; i<(length+1)/2; i++){
            idx = codeLength-(i+1)*2;
            cur = inputCode.substring(idx, idx + 2);
            curNum = parseInt(cur, 10);
            result = sprintf("%04X", curNum) + result;
        }
        return result;
    },

    /**
     * Function used to normalize user ID bitArray representation - 2 words width.
     * @param x
     */
    userIdBitsNormalize: function(x){
        var ln = x.length;
        if (ln == 2){
            return x;
        } else if (ln == 0){
            return [0,0];
        } else if (ln == 1){
            return [0, x[0]];
        } else {
            return [x[0], x[1]];
        }
    },

    /**
     * Converts user id argument to the 64bit SJCL bitArray.
     * @param x
     *      if x is a number, it is converted to SJCL bitArray. Warning, 32bit numbers are supported only.
     *      if x is a string, it is considered as hex coded string.
     *      if x is an array it is considered as SJCL bitArray.
     */
    userIdToBits: function(x){
        var ln;
        if (typeof(x) === 'number'){
            return eb.comm.hotp.userIdBitsNormalize(sjcl.codec.hex.toBits(sprintf("%x", x)));

        } else if (typeof(x) === 'string') {
            x = x.trim();
            ln = x.length;
            if (ln > 16 || ln === 0 || !(x.match(/^[0-9A-Fa-f]+$/))){
                throw new eb.exception.invalid("User ID string invalid");
            }

            return eb.comm.hotp.userIdBitsNormalize(sjcl.codec.hex.toBits(x));

        } else {
            return eb.comm.hotp.userIdBitsNormalize(x);

        }
    },

    /**
     * Converts user id argument to the hexcoded string coding 8 bytes.
     * @param x -
     *      if x is a number, will be converted to a hex string. Warning, 32bit numbers are supported only.
     *      if x is a string, it is considered as hex coded string. It is padded to 8 bytes.
     *      if x is an array it is considered as SJCL bitArray.
     */
    userIdToHex: function(x){
        var tmp,ln;
        if (typeof(x) === 'number'){
            // number
            return sprintf("%016x", x);

        } else if (typeof(x) === 'string') {
            // hex-coded string
            x = x.trim();
            ln = x.length;
            if (ln > 16 || ln === 0 || !(x.match(/^[0-9A-Fa-f]+$/))){
                throw new eb.exception.invalid("User ID string invalid");
            }

            return ln < 16 ? ('0'.repeat(16-ln)) + x : x;

        } else {
            // SJCL bitArray
            tmp = sjcl.codec.hex.fromBits(x);
            ln = tmp.length;
            if (ln > 16){
                throw new eb.exception.invalid("User ID string invalid");
            }
            return ln < 16 ? ('0'.repeat(16-ln)) + tmp : tmp;
        }
    },

    /**
     * Utility function to compute HOTP value, returned as string coded in decimal base.
     * @see https://tools.ietf.org/html/rfc4226
     * @param key           bitArray key | hexcoded key
     * @param ctr           8byte HOTP counter. bitArray or hexcoded string or numeric
     * @param length        length of the HOTP code.
     */
    hotpCompute: function(key, ctr, length){
        var hmac = new sjcl.misc.hmac(eb.misc.inputToBits(key), sjcl.hash.sha1);

        // Ctr is 8 byte counter, big endian coded. Make sure it has correct length.
        var ctrBits = eb.misc.inputToBits(ctr);
        var ctrHex = eb.misc.inputToHex(ctr).trim();
        var ctrHexLn = ctrHex.length;
        if (ctrHexLn > 16){
            throw new eb.exception.invalid("Counter value is too big");

        } else if (ctrHexLn < 16){
            ctrHex = ('0'.repeat(16-ctrHexLn)) + ctrHex;
            ctrBits = sjcl.codec.hex.toBits(ctrHex);
        }

        // 1. step, compute HMAC.
        var hs = hmac.mac(ctrBits);

        // 2. dynamic truncation. hs has 160 bits, take lower 4.
        // 0 <= offSet <= 15
        var offset = sjcl.bitArray.extract(hs, 156, 4) & 0xf;

        // Take low 31 bits from hs[offset]..hs[offset+3]
        // 3. Convert to a number.
        var snum = sjcl.bitArray.extract(hs, offset*8+1, 31);

        // 4. mod length. 31 bit => maximum length is 8. 9 makes no real sense.
        return snum % (Math.pow(10, length));
    },

    /**
     * Generates QR code link.
     * @param secret
     * @param options - additional options affecting QR code link generation.
     *      label: user name for HOTP auth,
     *      web: HOTP login gateway identification,
     *      issuer: HOTP account identification (e.g., enigmabridge, facebook, gmail, ....),
     *      ctr: HOTP counter,
     *      stripPadding: removes '=' from secret in the link, fixing problem with some HOTP authenticators.
     *
     * @returns {*}
     */
    hotpGetQrLink: function(secret, options){
        var defaults = {
            label: "EB",
            web: "enigmabridge.com",
            issuer: undefined,
            ctr: 0,
            digits: undefined,
            stripPadding: false
        };

        options = $.extend(defaults, options || {});
        var label = options && options.label;
        var web = options && options.web;
        var issuer = options && options.issuer;
        var ctr = options && options.ctr;
        var stripPadding = options && options.stripPadding;
        var digits = options && options.digits;

        // Construct the secret.
        var secretBits = eb.misc.inputToBits(secret);
        var secret32 = sjcl.codec.base32.fromBits(secretBits);
        if (stripPadding){
            secret32 = secret32.replace(/=/g,'');
        }

        return sprintf("otpauth://hotp/%s:%s?secret=%s%s%s%s",
            encodeURIComponent(label),
            encodeURIComponent(web),
            secret32,
            issuer !== undefined ? "&issuer="+encodeURIComponent(issuer) : "",
            ctr !== undefined ? "&counter="+ctr : "",
            digits !== undefined ? "&digits="+digits : ""
        );
    },

    /**
     * User context holder constructor.
     * Can be used by a client to hold all important data about user for HOTP.
     */
    hotpUserAuthCtxInfo: function(){

    },

    /**
     * HOTP general response constructor.
     * @extends eb.comm.response
     */
    hotpResponse: function(){

    },

    /**
     * General HOTP response parser constructor.
     */
    generalHotpParser: function(){

    },

    /**
     * New HOTPCTX request builder constructor.
     * @param options.
     *      userId:  user ID aditional entropy. By default 0000000000000001
     *      methods: flags for methods to include in context. USERAUTH_FLAG_HOTP, USERAUTH_FLAG_PASSWD.
     *      hotp: {digits}: hotp digits in the template. HOTP code length.
     *      passwd: {hash}: password hash used for authentication.
     */
    newHotpUserRequestBuilder: function(options){
        this.configure(options);
    },

    /**
     * New HOTPCTX response parser constructor.
     */
    newHotpUserResponseParser: function(){

    },

    /**
     * HOTP user authentication request builder constructor.
     */
    hotpUserAuthRequestBuilder: function(){

    },

    /**
     * HOTP user authentication response parser constructor.
     */
    hotpUserAuthResponseParser: function(){

    },

    /**
     * Generator of update auth context request constructor.
     */
    updateAuthContextRequestBuilder: function(options){
        this.configure(options);
    },

    /**
     * Auth context update response parser constuctor.
     */
    updateAuthContextResponseParser: function(options){

    },

    /**
     * Convenience function for building HOTP auth request.
     * @param userId hex coded user ID, 8B.
     * @param authCode hex coded auth code.
     * @param userCtx user context, bitArray.
     * @param method auth operation to perform, default=TLV_TYPE_HOTPCODE
     */
    getUserAuthRequest: function(userId, authCode, userCtx, method){
        var builder = new eb.comm.hotp.hotpUserAuthRequestBuilder(userId);
        return builder.build({
            userId: userId,
            authCode: authCode,
            userCtx: userCtx,
            authOperation: method || eb.comm.hotp.TLV_TYPE_HOTPCODE
        });
    },

    /**
     * General HOTP process data request constructor.
     * @param uo    UserObject to use for the call.
     * @abstract
     * @private
     */
    hotpRequest: function(uo){
        var av = eb.misc.absorbValue;
        av(this, uo, 'uo');
    },

    /**
     * Request for new HOTP CTX constructor.
     * @param options
     *      hotp:
     *      {
     *          uo    UserObject to use for the call.
     *          userId user ID to create context for.
     *          hotpLength number of digits
     *      }
     */
    newHotpUserRequest: function(options){
        options = options || {};
        this.configure(options);
    },

    /**
     * Request to authenticate HOTP user constructor.
     * @param options
     *      hotp:
     *      {
     *          uo UserObject to use for the call.
     *          userId
     *          userCtx
     *          hotpCode
     *          passwd
     *      }
     */
    authHotpUserRequest: function(options){
        options = options || {};
        this.configure(options);
    },

    /**
     * Request to update auth context constructor.
     * @param options
     *      hotp:
     *      {
     *          uo UserObject to use for the call.
     *          userId
     *          userCtx
     *          TODO: complete
     *      }
     */
    authContextUpdateRequest: function(options){
        options = options || {};
        this.configure(options);
    }

};

/**
 * HOTP user context holder.
 */
eb.comm.hotp.hotpUserAuthCtxInfo.inheritsFrom(eb.comm.base, {
    /**
     * User Auth context blob.
     * Server parameter.
     *
     * Authentication:
     *  - caller fills in with given user context. EB authenticates against this encrypted blob.
     *  - after authentication, this blob is updated by the server.
     *
     * New HOTPCTX():
     *  - caller leaves undefined.
     *  - server generates new user context. Server stores this value.
     */
    userCtx: undefined,

    /**
     * User ID to authenticate / create new HOTPCTX for.
     * Server parameter.
     */
    userId: undefined,

    /**
     * HOTP key - after new HOTPCTX(), server provides symmetric key for generating HOTP codes.
     * Used to generate HOTP on the client side. HOTP client is initialized with this value.
     * Client parameter.
     *
     * @output
     */
    hotpKey: undefined,

    /**
     * HOTP counter - counter value to generate HOTP codes on the client side.
     * Client parameter.
     *
     * Should be increased by each successful attempt on the client side.
     * By default is 0.
     */
    hotpCounter: 0,

    /**
     * HOTP code length. Length of the HOTP code in decimal digits.
     * Reasonable values: 6,7,8.
     */
    hotpCodeLength: undefined,

    /**
     * Auth password hash.
     */
    userPasswdHash: undefined
});

/**
 * HOTP EB response.
 */
eb.comm.hotp.hotpResponse.inheritsFrom(eb.comm.processDataResponse, {
    /**
     * bitArray with HOTP user context blob.
     */
    hotpUserCtx: undefined,

    /**
     * bitArray with UserID from the response.
     * Filled in after match from given user ID has been confirmed (if given).
     */
    hotpUserId: undefined,

    /**
     * bitArray with HOTP key returned in new HOTPCTX()
     */
    hotpKey: undefined,

    /**
     * Numeric result of the auth ProcessData call.
     */
    hotpStatus: undefined,

    /**
     * If true, whole HOTP response was parsed successfully.
     * In auth request it indicates context can be updated successfully.
     * Flag added by the response parser.
     * If false, exception was probably thrown during parsing.
     */
    hotpParsingSuccessful: false,

    /**
     * If true, server should update its user ctx for given user.
     * Flag added by the response parser.
     * If request fails from some reason, server still may need to update context - e.g., to
     * store fail counter.
     */
    hotpShouldUpdateCtx: false,

    toString: function(){
        return sprintf("HOTPResponse{hotpStatus=0x%04X, userId: %s, hotpKeyLen: %s, UserCtx: %s, parsingOk: %s, sub:{%s}}",
            this.hotpStatus,
            this.hotpUserId !== undefined ? sjcl.codec.hex.fromBits(eb.comm.hotp.userIdToBits(this.hotpUserId)) : 'undefined',
            this.hotpKey !== undefined ? sjcl.bitArray.bitLength(this.hotpKey) : 'undefined',
            this.hotpUserCtx !== undefined ? sjcl.codec.hex.fromBits(this.hotpUserCtx) : 'undefined',
            this.hotpParsingSuccessful,
            eb.comm.hotp.hotpResponse.superclass.toString.call(this)
        );
    }
});

/**
 * new HOTP user request builder.
 */
eb.comm.hotp.newHotpUserRequestBuilder.inheritsFrom(eb.comm.base, {
    defaults: {
        userId: undefined,
        methods: eb.comm.hotp.USERAUTH_FLAG_HOTP,
        hotp:{
            digits: eb.comm.hotp.HOTP_DIGITS_DEFAULT
        },
        passwd:{
            hash: undefined
        }
    },

    /**
     * Configures local object with the preferences.
     * @param options
     *      userId:  user ID aditional entropy. By default 0000000000000001
     *      methods: flags for methods to include in context. USERAUTH_FLAG_HOTP, USERAUTH_FLAG_PASSWD.
     *      hotp: {digits}: hotp digits in the template. HOTP code length.
     *      passwd: {hash}: password hash used for authentication.
     */
    configure: function(options){
        if (options) {
            this.defaults = $.extend(true, this.defaults, options || {});
        }
    },

    /**
     * New HOTCTX request builder.
     * @param options
     *      userId:  user ID aditional entropy. By default 0000000000000001
     *      methods: flags for methods to include in context. USERAUTH_FLAG_HOTP, USERAUTH_FLAG_PASSWD.
     *      hotp: {digits}: hotp digits in the template. HOTP code length.
     *      passwd: {hash}: password hash used for authentication.
     * @returns {*}
     */
    build: function(options){
        this.configure(options);

        var ba = sjcl.bitArray;
        var hex = sjcl.codec.hex;

        // Part 1 - auth context, encrypt with random password, template.
        var tpl = eb.comm.hotp.getCtxTemplate(this.defaults);
        var userAuthCtxPrepared = eb.comm.hotp.prepareUserContext(tpl);

        // Part 2 - auth context, unprotected
        var userAuthCtxUserID = ""; // extract from template
        var userAuthCtxUserIDBits = hex.toBits(userAuthCtxUserID);
        var userAuthCtxBits = ba.concat(userAuthCtxUserIDBits, tpl);

        var request = hex.toBits(sprintf("%02x", eb.comm.hotp.TLV_TYPE_USERAUTHCONTEXT));
        request = ba.concat(request, hex.toBits(sprintf("%04x", ba.bitLength(userAuthCtxPrepared)/8)));
        request = ba.concat(request, userAuthCtxPrepared);

        request = ba.concat(request, hex.toBits(sprintf("%02x", eb.comm.hotp.TLV_TYPE_NEWAUTHCONTEXT)));
        request = ba.concat(request, hex.toBits(sprintf("%04x", ba.bitLength(userAuthCtxBits)/8)));
        request = ba.concat(request, userAuthCtxBits);

        return request;
    }
});

/**
 * HOTP user auth request builder.
 */
eb.comm.hotp.hotpUserAuthRequestBuilder.inheritsFrom(eb.comm.base, {
    /**
     * Auth request builder.
     * @param options
     *      authCode: hex coded auth code. In case of HOTP, it should be the output of hotpCodeToHexCoded()
     *      userId: hex coded user ID, 8B.
     *      userCtx: user context, bitArray.
     *      authOperation: auth operation to perform, default=TLV_TYPE_HOTPCODE
     * @returns {*}
     */
    build: function(options){
        // ref: performTestUserAuthVerification
        var ba = sjcl.bitArray;
        var hex = sjcl.codec.hex;

        // Options.
        var defaults = {
            authCode: undefined,
            userId: undefined,
            userCtx: undefined,
            authOperation: eb.comm.hotp.TLV_TYPE_HOTPCODE
        };
        options = $.extend(defaults, options || {});
        var userId = options && options.userId;
        var authCode = options && options.authCode;
        var userCtx = options && options.userCtx;
        var authOperation = options && options.authOperation;
        if (!userId || !authCode || !userCtx || !authOperation){
            throw new eb.exception.invalid("User ID / HOTP / userCtx / authOperation code undefined");
        }

        var tlvOp, methods;
        if (authOperation == eb.comm.hotp.TLV_TYPE_HOTPCODE){
            tlvOp = eb.comm.hotp.TLV_TYPE_HOTPCODE;
            methods = eb.comm.hotp.USERAUTH_FLAG_HOTP;
        } else if (authOperation == eb.comm.hotp.TLV_TYPE_PASSWORDHASH){
            tlvOp = eb.comm.hotp.TLV_TYPE_PASSWORDHASH;
            methods = eb.comm.hotp.USERAUTH_FLAG_PASSWD;
        } else {
            throw new eb.exception.invalid("Unrecognized authentication method");
        }

        var verificationCode = eb.comm.hotp.userIdToHex(userId) + eb.misc.inputToHex(authCode);
        var verificationCodeBits = hex.toBits(verificationCode);
        var userCtxBits = eb.misc.inputToBits(userCtx);

        var request = hex.toBits(sprintf("%02x", eb.comm.hotp.TLV_TYPE_USERAUTHCONTEXT));
        request = ba.concat(request, hex.toBits(sprintf("%04x", ba.bitLength(userCtxBits)/8)));
        request = ba.concat(request, userCtxBits);

        request = ba.concat(request, hex.toBits(sprintf("%02x", tlvOp)));
        request = ba.concat(request, hex.toBits(sprintf("%04x", ba.bitLength(verificationCodeBits)/8)));
        request = ba.concat(request, verificationCodeBits);

        return request;
    }
});

/**
 * Generator of update auth context request
 */
eb.comm.hotp.updateAuthContextRequestBuilder.inheritsFrom(eb.comm.base, {
    defaults: {
        userId: undefined,
        userCtx: undefined,
        targetMethod: undefined,
        passwd: undefined
    },

    /**
     * Configures local object with the preferences.
     * @param options
     *      userId:  user ID aditional entropy. By default 0000000000000001
     *      userCtx: user context to update.
     *      targetMethod: method to update
     *      passwd: a new password hash to set in case of targetMethod == USERAUTH_FLAG_PASSWD
     */
    configure: function(options){
        if (options) {
            this.defaults = $.extend(true, this.defaults, options || {});
        }
    },

    build: function(options){
        // ref: performUpdateAuthCtx
        var ba = sjcl.bitArray;
        var hex = sjcl.codec.hex;
        this.configure(options);

        var userId = this.defaults.userId;
        var userCtx = this.defaults.userCtx;
        var passwd = this.defaults.passwd;
        var targetMethod = this.defaults.targetMethod;
        if (!userId || !userCtx || !targetMethod){
            throw new eb.exception.invalid("User ID / userCtx / targetMethod undefined");
        }
        if (targetMethod == eb.comm.hotp.USERAUTH_FLAG_PASSWD && passwd === undefined){
            throw new eb.exception.invalid("Password update method but password hash is undefined");
        }

        // Build update context request
        var userCtxBits = eb.misc.inputToBits(userCtx);
        var updateCtx = [];

        // User ID
        updateCtx = ba.concat(updateCtx, eb.comm.hotp.userIdToBits(userId));

        // Method #1 - HOTP
        if (targetMethod == eb.comm.hotp.USERAUTH_FLAG_HOTP){
            updateCtx = ba.concat(updateCtx, hex.toBits(sprintf("%02x0000", eb.comm.hotp.USER_AUTH_TYPE_HOTP)));
        }

        // Method #2 - Password
        if (targetMethod == eb.comm.hotp.USERAUTH_FLAG_PASSWD){
            var passwordBits = eb.misc.inputToBits(passwd);
            updateCtx = ba.concat(updateCtx, hex.toBits(sprintf("%02x%04x", eb.comm.hotp.USER_AUTH_TYPE_PASSWD, ba.bitLength(passwordBits)/8)));
            updateCtx = ba.concat(updateCtx, passwordBits);
        }

        // Method #3 - Global attempts
        if (targetMethod == eb.comm.hotp.USERAUTH_FLAG_GLOBALTRIES){
            updateCtx = ba.concat(updateCtx, hex.toBits(sprintf("%02x0000", eb.comm.hotp.USER_AUTH_TYPE_GLOBALTRIES)));
        }

        // Request itself.
        var request = [];
        request = ba.concat(request, hex.toBits(sprintf("%02x", eb.comm.hotp.TLV_TYPE_USERAUTHCONTEXT)));
        request = ba.concat(request, hex.toBits(sprintf("%04x", ba.bitLength(userCtxBits)/8)));
        request = ba.concat(request, userCtxBits);

        request = ba.concat(request, hex.toBits(sprintf("%02x", eb.comm.hotp.TLV_TYPE_UPDATEAUTHCONTEXT)));
        request = ba.concat(request, hex.toBits(sprintf("%04x", ba.bitLength(updateCtx)/8)));
        request = ba.concat(request, updateCtx);

        return request;
    }
});

/**
 * General HOTP response parser, base class.
 */
eb.comm.hotp.generalHotpParser.inheritsFrom(eb.comm.base, {
    response: undefined,

    /**
     * General parsing routine for HOTP responses.
     *
     * @param data
     * @param resp response to fill in with parsed data, takes preference to options.response
     * @param options
     *      tlvOp: HOTP operation to expect
     *      methods: auth methods to parse from the response (default=0)
     *      bIsLocalCtxUpdate: if set to YES, hotp key is updated in ctx (default=YES)
     *      userId: user ID to match against response user ID (default=undefined, no matching)
     *      response: response to fill in with parsed data. (default=undefined, new one is created)
     *
     * @returns {*|eb.comm.response|null|request|number|Object}
     */
    parse: function(data, resp, options){
        // ref: processUserAuthResponse
        var ba = sjcl.bitArray;
        var offset = 0;

        // Options.
        var defaults = {
            tlvOp: undefined,
            methods: 0x0,
            bIsLocalCtxUpdate: true,
            userId: undefined,
            response: undefined
        };

        options = $.extend(defaults, options || {});
        var tlvOp = options && options.tlvOp;
        var methods = options && options.methods;
        var bIsLocalCtxUpdate = options && options.bIsLocalCtxUpdate;
        var givenUserId = options && options.userId;
        var response = resp || (options && options.response);
        response = response || new eb.comm.hotp.hotpResponse();
        if (tlvOp === undefined){
            throw new eb.exception.corrupt("Main TLV operation undefined");
        }

        this.response = response;
        response.hotpStatus = 0x0;
        response.hotpParsingSuccessful = false;
        response.hotpShouldUpdateCtx = false;

        // Check for the plainData length = 0 was here, but protected data does not contain plain data,
        // it was moved to a different field in the response message so we don't check it here,
        // while original code in processUserAuthResponse does.

        // Check main tag value.
        var tag = ba.extract(data, offset, 8);
        offset += 8;
        if (tag != eb.comm.hotp.TLV_TYPE_USERAUTHCONTEXT){
            response.hotpStatus = eb.comm.status.SW_INVALID_TLV_FORMAT;
            throw new eb.exception.corrupt("Unrecognized TLV tag");
        }

        // Extract user context.
        var userCtxLen = ba.extract(data, offset, 16);
        offset += 16;
        response.hotpUserCtx = ba.bitSlice(data, offset, offset+userCtxLen*8);
        offset += userCtxLen*8;

        // Main TLV op type
        var msgTlv = ba.extract(data, offset, 8);
        offset += 8;
        if (msgTlv != tlvOp){
            response.hotpStatus = eb.comm.status.SW_INVALID_TLV_FORMAT;
            throw new eb.exception.corrupt("Main TLV tag does not match");
        }

        // Response
        var responseLen = ba.extract(data, offset, 16);
        offset += 16;

        // User ID
        var requestUserId = ba.bitSlice(data, offset, offset+eb.comm.hotp.USERAUTHCTX_MAIN_USERID_LENGTH*8);
        offset += eb.comm.hotp.USERAUTHCTX_MAIN_USERID_LENGTH*8;

        // Compare set user id.
        if (givenUserId){
            if (!ba.equal(eb.comm.hotp.userIdToBits(givenUserId), requestUserId)){
                response.hotpStatus = eb.comm.status.SW_AUTH_MISMATCH_USER_ID;
                throw new eb.exception.corrupt("User ID mismatch");
            }
        }
        response.hotpUserId = requestUserId;

        // Methods
        var methodTag, dataReturnLen;

        // Method #1
        if ((methods & eb.comm.hotp.USERAUTH_FLAG_HOTP) > 0){
            methodTag = ba.extract(data, offset, 8);
            offset += 8;
            if (methodTag != eb.comm.hotp.USER_AUTH_TYPE_HOTP){
                response.hotpStatus = eb.comm.status.SW_AUTHMETHOD_UNKNOWN;
                throw new eb.exception.corrupt("Invalid method tag");
            }

            dataReturnLen = ba.extract(data, offset, 16);
            offset += 16;
            if (bIsLocalCtxUpdate){
                response.hotpKey = ba.bitSlice(data, offset, offset+dataReturnLen*8);

            } else if (dataReturnLen != 0) {
                throw new eb.exception.corrupt("Should not contain data");
            }

            offset += dataReturnLen*8;
        }

        // Method #2
        if ((methods & eb.comm.hotp.USERAUTH_FLAG_PASSWD) > 0){
            methodTag = ba.extract(data, offset, 8);
            offset += 8;
            if (methodTag != eb.comm.hotp.USER_AUTH_TYPE_PASSWD){
                response.hotpStatus = eb.comm.status.SW_AUTHMETHOD_UNKNOWN;
                throw new eb.exception.corrupt("Invalid method tag");
            }

            dataReturnLen = ba.extract(data, offset, 16);
            offset += 16;
            if (dataReturnLen != 0) {
                throw new eb.exception.corrupt("Should not contain data");
            }
        }

        // Method #3
        if ((methods & eb.comm.hotp.USERAUTH_FLAG_GLOBALTRIES) > 0){
            methodTag = ba.extract(data, offset, 8);
            offset += 8;
            if (methodTag != eb.comm.hotp.USER_AUTH_TYPE_GLOBALTRIES){
                response.hotpStatus = eb.comm.status.SW_AUTHMETHOD_UNKNOWN;
                throw new eb.exception.corrupt("Invalid method tag");
            }

            dataReturnLen = ba.extract(data, offset, 16);
            offset += 16;
            if (dataReturnLen != 0) {
                throw new eb.exception.corrupt("Should not contain data");
            }
        }

        if ((offset + 16) != ba.bitLength(data)){
            throw new eb.exception.corrupt("Data length invalid");
        }

        response.hotpStatus = ba.extract(data, offset, 16);
        offset += 16;

        response.hotpShouldUpdateCtx = true;
        response.hotpParsingSuccessful = true;
        return response;
    }
});

/**
 * new HOTP user response parser.
 */
eb.comm.hotp.newHotpUserResponseParser.inheritsFrom(eb.comm.hotp.generalHotpParser, {
    parse: function(data, resp, options){
        options = options || {};
        options.tlvOp = eb.comm.hotp.TLV_TYPE_NEWAUTHCONTEXT;
        options.bIsLocalCtxUpdate = true;
        options.userId = undefined;
        options.methods = options.methods || eb.comm.hotp.USERAUTH_FLAG_HOTP;

        return eb.comm.hotp.newHotpUserResponseParser.superclass.parse.call(this, data, resp, options);
    }
});

/**
 * HOTP user auth response parser.
 */
eb.comm.hotp.hotpUserAuthResponseParser.inheritsFrom(eb.comm.hotp.generalHotpParser, {
    parse: function(data, resp, options){
        options = options || {};
        options.bIsLocalCtxUpdate = false;
        options.tlvOp = options.tlvOp || eb.comm.hotp.TLV_TYPE_HOTPCODE;
        options.methods = options.methods || eb.comm.hotp.USERAUTH_FLAG_HOTP;

        return eb.comm.hotp.hotpUserAuthResponseParser.superclass.parse.call(this, data, resp, options);
    }
});

/**
 * HOTP user auth response parser.
 */
eb.comm.hotp.updateAuthContextResponseParser.inheritsFrom(eb.comm.hotp.generalHotpParser, {
    parse: function(data, resp, options){
        options = options || {};
        options.bIsLocalCtxUpdate = true;
        options.tlvOp = eb.comm.hotp.TLV_TYPE_UPDATEAUTHCONTEXT;

        return eb.comm.hotp.updateAuthContextResponseParser.superclass.parse.call(this, data, resp, options);
    }
});

/**
 * HOTP request, base class.
 */
eb.comm.hotp.hotpRequest.inheritsFrom(eb.comm.processData, {
    /**
     * UserObject to use for the call.
     * TODO: once ready, move to processData request as comm keys will be stored there.
     */
    uo: undefined,

    /**
     * User ID to use.
     */
    userId: undefined,

    // Done & fail callback hooking.
    doneCallbackOrig: function(response, requestObj, data){},
    failCallbackOrig: function(failType, data){},

    done: function(x){
        this.doneCallbackOrig = x;
        eb.comm.hotp.hotpRequest.superclass.done.call(this, this.subDone);
        return this;
    },

    fail: function(x){
        this.failCallbackOrig = x;
        eb.comm.hotp.hotpRequest.superclass.fail.call(this, this.subFail);
        return this;
    },

    /**
     * Process configuration from the config object.
     * @param configObject object with the configuration.
     */
    configure: function(configObject){
        if (!configObject){
            this._log("Invalid config object");
            return;
        }

        // Configure with parent.
        eb.comm.hotp.hotpRequest.superclass.configure.call(this, configObject);

        // Configure this.
        if ('hotp' in configObject){
            this.configureHotp(configObject.hotp);
        }
    },

    /**
     * Configuration helper for HOTP data.
     * Called from configure() and build().
     * @param hotpData
     */
    configureHotp: function(hotpData){
        var ak = eb.misc.absorbKey;
        ak(this, hotpData, "uo");
        ak(this, hotpData, "userId");
    },

    /**
     * Response object is HOTP response.
     * After data unwrap, it will be processed further.
     *
     * @returns {eb.comm.hotp.hotpResponse}
     */
    getResponseObject: function(){
        return new eb.comm.hotp.hotpResponse();
    },

    /**
     * Called when underlying parser finished processing. Post processing here.
     *
     * @param response
     * @param requestObj
     * @param data
     * @private
     */
    subDone: function(response, requestObj, data){
        if (this.doneCallbackOrig){
            this.doneCallbackOrig(response, requestObj, data);
        }
    },

    /**
     * Called when underlying api request failed. Post processing here.
     * @param failType
     * @param data
     */
    subFail: function(failType, data){
        if (this.failCallbackOrig){
            this.failCallbackOrig(failType, data);
        }
    }
});

/**
 * New HOTP user request.
 * TODO: For configuration, new configuration builder can be implemented.
 */
eb.comm.hotp.newHotpUserRequest.inheritsFrom(eb.comm.hotp.hotpRequest, {
    /**
     * Configuration object given in construction / configure / build phases
     */
    authConfig: $.extend(true, {}, eb.comm.hotp.newHotpUserRequestBuilder.defaults),

    /**
     * Process HOTP configuration.
     * @param hotpObject hotp object
     */
    configureHotp: function(hotpObject){
        // Configure with parent.
        eb.comm.hotp.newHotpUserRequest.superclass.configureHotp.call(this, hotpObject);

        // authConfig
        this.authConfig = $.extend(true, this.authConfig, hotpObject || {});
    },

    /**
     * Initializes state and builds request
     */
    build: function(configObject){
        this._log("Building request body");
        if (configObject && 'hotp' in configObject){
            this.configureHotp(configObject.hotp);
        }

        // Build the new HOTPCTX() request.
        var builder = new eb.comm.hotp.newHotpUserRequestBuilder(this.authConfig);
        var upperRequest = builder.build();

        //var upperRequest = eb.comm.hotp.getNewUserRequest(this.userId, this.hotpLength);
        this._log("New HOTPCTX request: " + sjcl.codec.hex.fromBits(upperRequest));

        // Request data to lower process data builder.
        eb.comm.hotp.newHotpUserRequest.superclass.build.call(this, [], upperRequest);
    },

    /**
     * Process result, unwrapped by the underlying response parser.
     * @param response
     * @param requestObj
     * @param data
     */
    subDone: function(response, requestObj, data){
        var parser = new eb.comm.hotp.newHotpUserResponseParser(this.authConfig);
        var options = {};
        if (this.authConfig && this.authConfig.methods){
            options.methods = this.authConfig.methods;
        }

        try {
            this.response = response = parser.parse(response.protectedData, response, options);
            if (response.hotpStatus == eb.comm.status.SW_STAT_OK) {
                if (this.doneCallbackOrig) {
                    this.doneCallbackOrig(response, requestObj, data);
                }
                return;
            }
        } catch(e){
            data.hotpException = e;
        }

        if (this.failCallbackOrig){
            this.failCallbackOrig(eb.comm.status.PDATA_FAIL_RESPONSE_FAILED, data);
        }
    }
});

/**
 * HOTP user auth request.
 */
eb.comm.hotp.authHotpUserRequest.inheritsFrom(eb.comm.hotp.hotpRequest, {
    userCtx: undefined,
    hotpCode: undefined,
    hotpLength: eb.comm.hotp.HOTP_DIGITS_DEFAULT,
    passwd: undefined,

    // Private variables, request configures response parser.
    authMethod: undefined,
    authFlag: undefined,

    /**
     * Process HOTP configuration.
     * @param hotpObject hotp object
     */
    configureHotp: function(hotpObject){
        // Configure with parent.
        eb.comm.hotp.authHotpUserRequest.superclass.configureHotp.call(this, hotpObject);

        // Configure this.
        var ak = eb.misc.absorbKey;
        ak(this, hotpObject, "userCtx");
        ak(this, hotpObject, "hotpCode");
        ak(this, hotpObject, "hotpLength");
        ak(this, hotpObject, "passwd");
    },

    /**
     * Initializes state and builds request
     */
    build: function(configObject){
        this._log("Building request body");
        if (configObject && 'hotp' in configObject){
            this.configureHotp(configObject.hotp);
        }

        // Current limitation - only one method at a time
        if (this.passwd && this.passwd.length > 0 && this.hotpCode){
            this._log("Multiple authentication methods were required.");
            throw new eb.exception.invalid("Authentication supports only one authentication method at a time");
        }

        var authCode;
        if (this.passwd && this.passwd.length > 0){
            authCode = this.passwd;
            this.authMethod = eb.comm.hotp.TLV_TYPE_PASSWORDHASH;
            this.authFlag = eb.comm.hotp.USERAUTH_FLAG_PASSWD;
            this._log("Using Password authentication");

        } else if (this.hotpCode) {
            authCode = eb.comm.hotp.hotpCodeToHexCoded(this.hotpCode, this.hotpLength);
            this.authMethod = eb.comm.hotp.TLV_TYPE_HOTPCODE;
            this.authFlag = eb.comm.hotp.USERAUTH_FLAG_HOTP;
            this._log("Using HOTP authentication");

        } else {
            throw new eb.exception.invalid("No authentication data given");
        }

        // Build the auth request.
        var upperRequest = eb.comm.hotp.getUserAuthRequest(
            this.userId,
            authCode,
            this.userCtx,
            this.authMethod);

        this._log("HOTP Auth request: " + sjcl.codec.hex.fromBits(upperRequest));

        // Request data to lower process data builder.
        eb.comm.hotp.authHotpUserRequest.superclass.build.call(this, [], upperRequest);
    },

    /**
     * Process result, unwrapped by the underlying response parser.
     * @param response
     * @param requestObj
     * @param data
     */
    subDone: function(response, requestObj, data){
        var parser = new eb.comm.hotp.hotpUserAuthResponseParser();
        var options = {
            userId: this.userId,
            tlvOp:  this.authMethod,
            methods:this.authFlag
        };

        try {
            this.response = response = parser.parse(response.protectedData, response, options);
            if (response.hotpStatus == eb.comm.status.SW_STAT_OK) {
                if (this.doneCallbackOrig) {
                    this.doneCallbackOrig(response, requestObj, data);
                }
                return;
            }

        } catch(e){
            data.hotpException = e;
        }

        if (this.failCallbackOrig){
            data.response = this.response;
            this.failCallbackOrig(eb.comm.status.PDATA_FAIL_RESPONSE_FAILED, data);
        }
    }
});

/**
 * Request to update auth context.
 */
eb.comm.hotp.authContextUpdateRequest.inheritsFrom(eb.comm.hotp.hotpRequest, {
    userCtx: undefined,
    passwd: undefined,
    method: undefined,

    /**
     * Process HOTP configuration.
     * @param hotpObject hotp object
     */
    configureHotp: function(hotpObject){
        // Configure with parent.
        eb.comm.hotp.authContextUpdateRequest.superclass.configureHotp.call(this, hotpObject);

        // Configure this.
        var ak = eb.misc.absorbKey;
        ak(this, hotpObject, "userCtx");
        ak(this, hotpObject, "method");
        ak(this, hotpObject, "passwd");
    },

    /**
     * Initializes state and builds request
     */
    build: function(configObject){
        this._log("Building request body");
        if (configObject && 'hotp' in configObject){
            this.configureHotp(configObject.hotp);
        }

        if (this.method === undefined){
            throw new eb.exception.invalid("Update method not defined");
        }
        if (this.userId === undefined || this.userCtx === undefined){
            throw new eb.exception.invalid("UserID / UserCtx not defined");
        }
        if (this.method === eb.comm.hotp.USERAUTH_FLAG_PASSWD && this.passwd === undefined){
            throw new eb.exception.invalid("Update method is password but password is undefined");
        }

        // Build the auth request.
        var reqBuilder = new eb.comm.hotp.updateAuthContextRequestBuilder({
            userId: this.userId,
            userCtx: this.userCtx,
            targetMethod: this.method,
            passwd: this.passwd
        });

        var upperRequest = reqBuilder.build();

        this._log("Auth context update request: " + sjcl.codec.hex.fromBits(upperRequest));

        // Request data to lower process data builder.
        eb.comm.hotp.authContextUpdateRequest.superclass.build.call(this, [], upperRequest);
    },

    /**
     * Process result, unwrapped by the underlying response parser.
     * @param response
     * @param requestObj
     * @param data
     */
    subDone: function(response, requestObj, data){
        var parser = new eb.comm.hotp.updateAuthContextResponseParser();
        var options = {
            userId: this.userId,
            methods:this.method
        };

        try {
            this.response = response = parser.parse(response.protectedData, response, options);
            if (response.hotpStatus == eb.comm.status.SW_STAT_OK) {
                if (this.doneCallbackOrig) {
                    this.doneCallbackOrig(response, requestObj, data);
                }
                return;
            }

        } catch(e){
            data.hotpException = e;
        }

        if (this.failCallbackOrig){
            data.response = this.response;
            this.failCallbackOrig(eb.comm.status.PDATA_FAIL_RESPONSE_FAILED, data);
        }
    }
});

