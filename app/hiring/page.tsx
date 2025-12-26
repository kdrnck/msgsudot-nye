
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Rocket, Palette, BarChart, Gift, Smile, Loader2, Sparkles, Send, Video, DollarSign } from "lucide-react"

export default function HiringPage() {
    const router = useRouter()
    return (
        <div className="min-h-screen bg-black text-white selection:bg-pink-500 selection:text-white pb-20">
            <div className="fixed inset-0 bg-[url('/brand/pattern.png')] opacity-10 pointer-events-none"></div>

            {/* Back Button */}
            <div className="p-4 relative z-10">
                <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => router.push('/')}>
                    <ArrowLeft className="w-5 h-5 mr-2" /> Geri Dön
                </Button>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-12 relative z-10">

                {/* Intro */}
                <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 text-sm font-medium text-purple-300 mb-4">
                        <Sparkles className="w-4 h-4" /> Birlikte Büyüyelim
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-pink-200">
                        Yeni Bir Şeyler Başlıyor.
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed max-w-2xl mx-auto">
                        Yeni bi proje üzerinde çalışıyorum ve birlikte çalışmak için meraklı kişiler arıyorum!
                        Güzellik merkezleriyle başlayacak ve randevu içeren tüm işletmelere bulaşmak isteyen bir Software as a service girişimi.
                        Eğer aşağıdakilerden biriysen ve bu hikayenin parçası olmak istersen, gel konuşalım.
                    </p>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-gray-400 italic">
                        "Açıkcası çok bi 'tecrübe beklentim yok. Aşağıdaki rollerden birine kendini uygun görüyorsan ya da yapabileceğine inanıyorsan yeterli. Süreci beraberce öğrenmek ve beraber yol almak istiyorum!"
                    </div>
                </div>

                {/* Roles */}
                <div className="grid md:grid-cols-2 gap-6">
                    <RoleCard
                        title="Grafik Tasarımcı / Sosyal Medya"
                        icon={Palette}
                        description="İşletmeler için reklam görselleri ve projenin kendi sosyal medyası için içerik üretecek görsel sihirbazı."
                        detail="Tanıtım, reklam ve özellik anlatan postlar üretmek."
                        btnText="Kendini Göster"
                        roleId="graphic_design"
                        color="text-pink-400"
                        gradient="from-pink-500/10 to-transparent"
                    />

                    <RoleCard
                        title="Veri Analisti"
                        icon={BarChart}
                        description="İstatistik kulübüne selamlar! Verileri anlamlı ilişkilere dönüştürecek sayı fısıldayanı."
                        detail="Satış oranlarını artırmak, A/B testleri yapmak ve büyüme stratejilerine kafa patlatmak."
                        btnText="Verilerle Gel"
                        roleId="data_analyst"
                        color="text-blue-400"
                        gradient="from-blue-500/10 to-transparent"
                    />

                    <RoleCard
                        title="Videographer"
                        icon={Video}
                        description="Instagram story/post ya da tiktok paylaşımı formatında reklam içeriğini oluşturmak, çekmek ve video düzenlemesini yapmak üzere birini arıyorum."
                        detail="Eğer daha önce öyle ya da böyle içerik oluşturma/düzenleme tecrübeniz varsa çekinmeyin!"
                        btnText="Aksiyon!"
                        roleId="cameraman"
                        color="text-purple-400"
                        gradient="from-purple-500/10 to-transparent"
                    />

                    <RoleCard
                        title="Satış Partneri"
                        icon={DollarSign}
                        description="Gerçek hayatta işletmelere gidip proje hakkında sunum yapacak, işletmenin sorunlarını anlayıp uygun çözümlerimizle onları buluşturacak ya da ihtiyacı olan şeyleri analiz edecek birini arıyorum."
                        detail="Bağladığın her işletme başına ekstra prim ücreti! Sunum yapmakta iyiyim, iyi bir konuşmacıyım ve bu yeteneğimden para kazanmak istiyorum diyorsanız doğru seçenek."
                        btnText="Anlaşma Yap"
                        roleId="sales_partner"
                        color="text-green-400"
                        gradient="from-green-500/10 to-transparent"
                    />
                </div>

                {/* Lucky Section */}
                <section className="space-y-6 pt-12">
                    <h2 className="text-3xl font-bold text-center">Kendini Şanslı Mı Hissediyorsun?</h2>

                    <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/20 overflow-hidden relative group hover:border-green-500/50 transition-colors">
                        <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
                            <Gift className="w-12 h-12 text-green-400 mb-4 animate-bounce" />
                            <h3 className="text-xl font-bold text-green-300 mb-2">İşletme Öner, Kazan</h3>
                            <p className="text-gray-400 mb-6">
                                Tanıdık bir kuaför, güzellik salonu veya dijital randevu sistemine ihtiyaç duyan bir işletme tanıyorsan bizimle paylaş. Başarıya ulaşırsa hediye çeki senin!
                            </p>
                            <ApplicationButton role="referral" btnText="İşletme Öner" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white" />
                        </CardContent>
                    </Card>
                </section>

                {/* General Application */}
            </div>

            {/* Footer is handled by layout if present, OR we can exclude it here. 
          User asked for 'no navbar', usually implies minimal page. 
          But footer is usually acceptable. 
          I will NOT include Main Footer here to keep it distinct or I WILL?
          The request was global footer updates. 
          Hiring page probably needs the Footer? 
          "no navbar" usually implies landing page style.
          I'll Add Footer manually here if needed, but if it is in layout.tsx it's already there.
          Wait, layout doesn't have Footer. Page.tsx has Footer.
          So I should add Footer here if I want it.
          I will add Footer here.
       */}
        </div>
    )
}

function RoleCard({ title, icon: Icon, description, detail, btnText, roleId, color, gradient }: any) {
    return (
        <Card className={`bg-white/5 border-white/10 hover:border-white/20 transition-all duration-300 group overflow-hidden relative`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
            <CardContent className="p-6 flex flex-col h-full relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${color}`}>{title}</h3>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed bg-black/20 p-2 rounded">{description}</p>
                <p className="text-gray-400 text-xs mb-6 flex-1">{detail}</p>

                <ApplicationButton role={roleId} btnText={btnText} />
            </CardContent>
        </Card>
    )
}

function ApplicationButton({ role, btnText, variant = "default", className }: any) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [formData, setFormData] = useState({ fullName: "", contact: "" })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Save to Supabase
        const { error } = await supabase.from('hiring_applications').insert({
            full_name: formData.fullName,
            contact_info: formData.contact,
            role_type: role
        })

        setLoading(false)
        if (error) {
            alert("Bir hata oluştu: " + error.message)
        } else {
            setDone(true)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) setDone(false); setOpen(v); }}>
            <DialogTrigger render={
                <Button className={`w-full font-bold tracking-wide transition-all ${className}`} variant={variant}>
                    {btnText} <Rocket className="w-4 h-4 ml-2" />
                </Button>
            } />
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {done ? "Mesajın Alındı! 🚀" : "Tanışalım"}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {done ? "İlgilendiğin için teşekkürler. En kısa sürede dönüş yapacağım." : "Geri dönüş yapabilmek için bilgilerine ihtiyacım var."}
                    </DialogDescription>
                </DialogHeader>

                {!done ? (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label>İsim Soyisim</Label>
                            <Input
                                value={formData.fullName}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="Adın Soyadın"
                                className="bg-zinc-800 border-zinc-700 focus:ring-purple-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon / İletişim</Label>
                            <Input
                                value={formData.contact}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                placeholder="0555..."
                                className="bg-zinc-800 border-zinc-700 focus:ring-purple-500"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Gönder</>}
                        </Button>
                    </form>
                ) : (
                    <div className="flex justify-center py-6">
                        <Button variant="outline" onClick={() => setOpen(false)}>Kapat</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
