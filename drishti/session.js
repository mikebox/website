(function(){
var REG="https://unstop.com/college-fests/drishti-2026-hosted-by-pgpem-iim-bangalore-indian-institute-of-management-iim-bangalore-523573";
document.querySelectorAll("[data-reg]").forEach(function(a){a.href=REG});
document.querySelectorAll(".fs").forEach(function(f){f.innerHTML='<i class="a"></i><i class="b1"></i><i class="a"></i><i class="z"></i><i class="sk"></i><i class="st2"></i><i class="nv"></i><i class="b2"></i><i class="a"></i>'});
var io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add("in");io.unobserve(x.target)}})},{threshold:.1});
document.querySelectorAll(".rv").forEach(function(el,i){el.style.transitionDelay=(i%4)*60+"ms";io.observe(el)});
})();
