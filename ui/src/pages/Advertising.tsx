import { useState } from 'react';
import { useStore, type AdCampaign, type AdAccount, type RetargetingPixel, type ScheduledPost } from '../store/useStore';
import { api } from '../lib/api';
import { getTierMode, isPaidTier } from '../lib/tier';
import TierBadge from '../components/TierBadge';
import UpgradeCTA from '../components/UpgradeCTA';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Leaf, DollarSign, Target, BarChart3, Globe, Building2, Calendar, Clock, Search, Copy, Check, Plus, ExternalLink, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const platforms = [
  { id: 'google', name: 'Google Ads', icon: Globe, color: 'text-[#4285F4]', spend: 0, budget: 0, campaigns: 0 },
  { id: 'meta', name: 'Meta Ads', icon: Users, color: 'text-[#1877F2]', spend: 0, budget: 0, campaigns: 0 },
  { id: 'linkedin', name: 'LinkedIn Ads', icon: Building2, color: 'text-[#0A66C2]', spend: 0, budget: 0, campaigns: 0 },
  { id: 'twitter', name: 'Twitter/X Ads', icon: ExternalLink, color: 'text-[#1DA1F2]', spend: 0, budget: 0, campaigns: 0 },
];

export default function Advertising() {
  const tierMode = getTierMode();
  const [activeTab, setActiveTab] = useState<'organic' | 'paid' | 'retargeting' | 'analytics'>('organic');
  const scheduledPosts = useStore(s => s.scheduledPosts);
  const pixels = useStore(s => s.pixels);
  const adCampaigns = useStore(s => s.adCampaigns);
  const adAccounts = useStore(s => s.adAccounts);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-[#F1F5F9]'>Ad Engine</h1>
          <p className='text-sm text-[#94A3B8]'>Automated marketing — from organic to paid</p>
        </div>
        <TierBadge />
      </div>

      <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as typeof activeTab)} className='space-y-4'>
        <TabsList className='bg-[#111827] border border-[#1E293B]'>
          <TabsTrigger value='organic' className='data-[state=active]:bg-[#00D4AA]/10 data-[state=active]:text-[#00D4AA]'><Leaf size={14} className='mr-1.5' /> Organic</TabsTrigger>
          <TabsTrigger value='paid' className='data-[state=active]:bg-[#3B82F6]/10 data-[state=active]:text-[#3B82F6]'><DollarSign size={14} className='mr-1.5' /> Paid Ads</TabsTrigger>
          <TabsTrigger value='retargeting' className='data-[state=active]:bg-[#8B5CF6]/10 data-[state=active]:text-[#8B5CF6]'><Target size={14} className='mr-1.5' /> Retargeting</TabsTrigger>
          <TabsTrigger value='analytics' className='data-[state=active]:bg-[#F59E0B]/10 data-[state=active]:text-[#F59E0B]'><BarChart3 size={14} className='mr-1.5' /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value='organic'><OrganicTab scheduledPosts={scheduledPosts} /></TabsContent>
        <TabsContent value='paid'>{isPaidTier(tierMode) ? <PaidAdsTab campaigns={adCampaigns} accounts={adAccounts} /> : <UpgradeCTA featureName='Paid Advertising' description='Connect Google Ads, Meta Ads, and LinkedIn Ads to manage paid campaigns from one dashboard.' />}</TabsContent>
        <TabsContent value='retargeting'>{isPaidTier(tierMode) ? <RetargetingTab pixels={pixels} /> : <UpgradeCTA featureName='Retargeting Pixels' description='Install tracking pixels and build custom audiences for paid retargeting campaigns.' />}</TabsContent>
        <TabsContent value='analytics'>{isPaidTier(tierMode) ? <AnalyticsTab campaigns={adCampaigns} /> : <UpgradeCTA featureName='Advanced Analytics' description='Unlock attribution modeling, cohort analysis, and cross-platform paid reporting.' />}</TabsContent>
      </Tabs>
    </div>
  );
}

function OrganicTab({ scheduledPosts }: { scheduledPosts: ScheduledPost[] }) {
  const [url, setUrl] = useState('');
  const [seoResult, setSeoResult] = useState<{ score: number; issues: string[] } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postPlatform, setPostPlatform] = useState<'twitter' | 'linkedin' | 'facebook'>('twitter');
  const [postDate, setPostDate] = useState('');
  const addScheduledPost = useStore(s => s.addScheduledPost);

  async function runSEO() {
    if (!url) return;
    setAnalyzing(true);
    try {
      const res = await api.analyzeSEO(url);
      setSeoResult(res);
    } catch { toast.error('SEO analysis failed'); }
    setAnalyzing(false);
  }

  function schedule() {
    if (!postContent || !postDate) return;
    addScheduledPost({ platform: postPlatform, content: postContent, scheduledAt: new Date(postDate).toISOString(), status: 'scheduled' });
    setPostContent('');
    setPostDate('');
    toast.success('Post scheduled');
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card className='bg-[#111827] border-[#1E293B]'>
          <CardHeader className='pb-2'><CardTitle className='text-sm flex items-center gap-2'><Calendar size={14} /> Social Scheduler</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            <Select value={postPlatform} onValueChange={(v: 'twitter' | 'linkedin' | 'facebook') => setPostPlatform(v)}>
              <SelectTrigger className='bg-[#0A0F1E] border-[#1E293B]'><SelectValue /></SelectTrigger>
              <SelectContent className='bg-[#111827] border-[#1E293B]'>
                <SelectItem value='twitter'>Twitter/X</SelectItem>
                <SelectItem value='linkedin'>LinkedIn</SelectItem>
                <SelectItem value='facebook'>Facebook</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder='Write your post...' className='bg-[#0A0F1E] border-[#1E293B] text-sm min-h-[80px]' />
            <Input type='datetime-local' value={postDate} onChange={e => setPostDate(e.target.value)} className='bg-[#0A0F1E] border-[#1E293B]' />
            <Button onClick={schedule} disabled={!postContent || !postDate} className='w-full bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E]'><Plus size={14} className='mr-1' /> Schedule Post</Button>
          </CardContent>
        </Card>

        <Card className='bg-[#111827] border-[#1E293B]'>
          <CardHeader className='pb-2'><CardTitle className='text-sm flex items-center gap-2'><Search size={14} /> SEO Analyzer</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex gap-2'>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder='https://example.com' className='bg-[#0A0F1E] border-[#1E293B]' />
              <Button onClick={runSEO} disabled={analyzing || !url} className='bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E]'>{analyzing ? 'Analyzing...' : 'Analyze'}</Button>
            </div>
            {seoResult && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'><span className='text-xs text-[#94A3B8]'>Score</span><span className={`text-sm font-bold ${seoResult.score >= 80 ? 'text-[#00D4AA]' : seoResult.score >= 60 ? 'text-[#F59E0B]' : 'text-red-400'}`}>{seoResult.score}/100</span></div>
                <Progress value={seoResult.score} className='h-2' />
                {seoResult.issues.length > 0 && <div className='text-xs text-[#94A3B8] space-y-1'>{seoResult.issues.map((i: string) => <div key={i} className='flex items-center gap-1'><AlertTriangle size={10} />{i}</div>)}</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className='bg-[#111827] border-[#1E293B]'>
        <CardHeader className='pb-2'><CardTitle className='text-sm'>Upcoming Posts</CardTitle></CardHeader>
        <CardContent>
          {scheduledPosts.length === 0 ? <p className='text-xs text-[#94A3B8] py-4 text-center'>No scheduled posts</p> : (
            <ScrollArea className='h-[200px]'>
              <div className='space-y-2'>
                {scheduledPosts.map(p => (
                  <div key={p.id} className='flex items-center justify-between p-2 rounded bg-[#0A0F1E] border border-[#1E293B]'>
                    <div className='flex items-center gap-2'>
                      <Badge className='text-[10px] bg-[#1A2235] text-[#94A3B8]'>{p.platform}</Badge>
                      <span className='text-xs text-[#F1F5F9] truncate max-w-[300px]'>{p.content}</span>
                    </div>
                    <div className='flex items-center gap-2 text-xs text-[#94A3B8]'>
                      <Clock size={12} />
                      {new Date(p.scheduledAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaidAdsTab({ campaigns, accounts }: { campaigns: AdCampaign[]; accounts: AdAccount[] }) {
  const tierMode = getTierMode();
  const [showConnect, setShowConnect] = useState<string | null>(null);
  const addAdCampaign = useStore(s => s.addAdCampaign);
  const [newCampaign, setNewCampaign] = useState<{ name: string; platform: AdCampaign['platform']; budget: number }>({ name: '', platform: 'google', budget: 50 });

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {platforms.map(p => {
          const Icon = p.icon;
          const connected = accounts.some(a => a.platform === p.id && a.connected);
          return (
            <Card key={p.id} className='bg-[#111827] border-[#1E293B]'>
              <CardContent className='p-3'>
                <div className='flex items-center justify-between mb-2'>
                  <Icon size={18} className={p.color} />
                  {connected ? <Badge className='bg-[#00D4AA]/20 text-[#00D4AA] text-[10px]'>Connected</Badge> : <Badge className='bg-[#1A2235] text-[#94A3B8] text-[10px]'>Disconnected</Badge>}
                </div>
                <p className='text-xs font-semibold text-[#F1F5F9]'>{p.name}</p>
                {connected && (
                  <div className='mt-2 space-y-1'>
                    <div className='flex justify-between text-xs'><span className='text-[#94A3B8]'>Spend</span><span className='text-[#F1F5F9]'>${p.spend}</span></div>
                    <div className='flex justify-between text-xs'><span className='text-[#94A3B8]'>Budget</span><span className='text-[#F1F5F9]'>${p.budget}</span></div>
                    <Progress value={(p.spend / p.budget) * 100} className='h-1' /></div>
                )}
                {!connected && (
                  <Button onClick={() => setShowConnect(p.id)} size='sm' className='mt-2 w-full bg-[#1A2235] hover:bg-[#334155] text-xs'>
                    {isPaidTier(tierMode) ? 'Connect' : 'Upgrade to Connect'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showConnect && !isPaidTier(tierMode) && (
        <UpgradeCTA featureName={`${platforms.find(p => p.id === showConnect)?.name} Connector`} description='Paid ad connectors require a paid SquidWeave tier.' />
      )}

      <Card className='bg-[#111827] border-[#1E293B]'>
        <CardHeader className='pb-2 flex items-center justify-between'><CardTitle className='text-sm'>Campaigns</CardTitle><Badge className='bg-[#3B82F6]/20 text-[#3B82F6]'>{campaigns.length}</Badge></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className='border-[#1E293B]'><TableHead className='text-[#94A3B8] text-xs'>Name</TableHead><TableHead className='text-[#94A3B8] text-xs'>Platform</TableHead><TableHead className='text-[#94A3B8] text-xs'>Status</TableHead><TableHead className='text-[#94A3B8] text-xs'>Budget</TableHead><TableHead className='text-[#94A3B8] text-xs'>Spend</TableHead><TableHead className='text-[#94A3B8] text-xs'>ROAS</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(c => (
                <TableRow key={c.id} className='border-[#1E293B]'>
                  <TableCell className='text-xs text-[#F1F5F9]'>{c.name}</TableCell>
                  <TableCell><Badge className='text-[10px] bg-[#1A2235]'>{c.platform}</Badge></TableCell>
                  <TableCell><Badge className={`text-[10px] ${c.status === 'active' ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : c.status === 'paused' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#1A2235] text-[#94A3B8]'}`}>{c.status}</Badge></TableCell>
                  <TableCell className='text-xs text-[#94A3B8]'>${c.budget}/day</TableCell>
                  <TableCell className='text-xs text-[#94A3B8]'>${c.spend}</TableCell>
                  <TableCell className='text-xs font-semibold text-[#00D4AA]'>{c.roas}x</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className='bg-[#111827] border-[#1E293B]'>
        <CardHeader className='pb-2'><CardTitle className='text-sm'>Quick Create Campaign</CardTitle></CardHeader>
        <CardContent className='flex gap-2'>
          <Input value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder='Campaign name' className='bg-[#0A0F1E] border-[#1E293B]' />
          <Select value={newCampaign.platform} onValueChange={(v: AdCampaign['platform']) => setNewCampaign({ ...newCampaign, platform: v })}>
            <SelectTrigger className='bg-[#0A0F1E] border-[#1E293B] w-[140px]'><SelectValue /></SelectTrigger>
            <SelectContent className='bg-[#111827] border-[#1E293B]'>
              <SelectItem value='google'>Google</SelectItem>
              <SelectItem value='meta'>Meta</SelectItem>
              <SelectItem value='linkedin'>LinkedIn</SelectItem>
            </SelectContent>
          </Select>
          <Input type='number' value={newCampaign.budget} onChange={e => setNewCampaign({ ...newCampaign, budget: Number(e.target.value) })} className='bg-[#0A0F1E] border-[#1E293B] w-[100px]' />
          <Button
            disabled={!isPaidTier(tierMode) || !newCampaign.name}
            onClick={() => { addAdCampaign({ ...newCampaign, status: 'draft', spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, roas: 0 }); setNewCampaign({ name: '', platform: 'google', budget: 50 }); toast.success('Campaign created'); }}
            className='bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E] disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Plus size={14} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RetargetingTab({ pixels }: { pixels: RetargetingPixel[] }) {
  const [pixelName, setPixelName] = useState('');
  const [pixelPlatform, setPixelPlatform] = useState<'google' | 'meta' | 'linkedin' | 'twitter'>('meta');
  const addPixel = useStore(s => s.addPixel);
  const [copied, setCopied] = useState<string | null>(null);

  function createPixel() {
    if (!pixelName) return;
    addPixel({ platform: pixelPlatform, name: pixelName, code: '', installed: false, audienceSize: 0 });
    setPixelName('');
    toast.success('Pixel created');
  }

  return (
    <div className='space-y-4'>
      <Card className='bg-[#111827] border-[#1E293B]'>
        <CardHeader className='pb-2'><CardTitle className='text-sm'>Create Pixel</CardTitle></CardHeader>
        <CardContent className='flex gap-2'>
          <Input value={pixelName} onChange={e => setPixelName(e.target.value)} placeholder='Pixel name' className='bg-[#0A0F1E] border-[#1E293B]' />
          <Select value={pixelPlatform} onValueChange={(v: 'google' | 'meta' | 'linkedin' | 'twitter') => setPixelPlatform(v)}>
            <SelectTrigger className='bg-[#0A0F1E] border-[#1E293B] w-[140px]'><SelectValue /></SelectTrigger>
            <SelectContent className='bg-[#111827] border-[#1E293B]'>
              <SelectItem value='meta'>Meta</SelectItem>
              <SelectItem value='google'>Google</SelectItem>
              <SelectItem value='linkedin'>LinkedIn</SelectItem>
              <SelectItem value='twitter'>Twitter</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={createPixel} className='bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E]'><Plus size={14} /></Button>
        </CardContent>
      </Card>

      {pixels.map(p => (
        <Card key={p.id} className='bg-[#111827] border-[#1E293B]'>
          <CardHeader className='pb-2 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Badge className='text-[10px] bg-[#1A2235]'>{p.platform}</Badge>
              <CardTitle className='text-sm'>{p.name}</CardTitle>
            </div>
            {p.installed ? <Badge className='bg-[#00D4AA]/20 text-[#00D4AA] text-[10px]'>Installed</Badge> : <Badge className='bg-[#F59E0B]/20 text-[#F59E0B] text-[10px]'>Pending</Badge>}
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='bg-[#0A0F1E] border border-[#1E293B] rounded p-2 font-mono text-[10px] text-[#94A3B8] overflow-x-auto'>{p.code || '<pixel code will appear here>'}</div>
            <div className='flex items-center gap-2'>
              <Button size='sm' variant='outline' className='border-[#1E293B] text-xs' onClick={() => { navigator.clipboard.writeText(p.code); setCopied(p.id); setTimeout(() => setCopied(null), 2000); }}>
                {copied === p.id ? <><Check size={12} className='mr-1' /> Copied</> : <><Copy size={12} className='mr-1' /> Copy Code</>}
              </Button>
              <div className='ml-auto text-xs text-[#94A3B8]'>Audience: <span className='text-[#F1F5F9]'>{p.audienceSize?.toLocaleString() || 0}</span></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnalyticsTab({ campaigns }: { campaigns: AdCampaign[] }) {
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const avgROAS = campaigns.filter(c => c.roas > 0).reduce((sum, c) => sum + c.roas, 0) / campaigns.filter(c => c.roas > 0).length || 0;

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <Card className='bg-[#111827] border-[#1E293B]'><CardContent className='p-3'><p className='text-xs text-[#94A3B8]'>Total Spend</p><p className='text-xl font-bold text-[#F1F5F9]'>${totalSpend.toLocaleString()}</p></CardContent></Card>
        <Card className='bg-[#111827] border-[#1E293B]'><CardContent className='p-3'><p className='text-xs text-[#94A3B8]'>Clicks</p><p className='text-xl font-bold text-[#00D4AA]'>{totalClicks.toLocaleString()}</p></CardContent></Card>
        <Card className='bg-[#111827] border-[#1E293B]'><CardContent className='p-3'><p className='text-xs text-[#94A3B8]'>Conversions</p><p className='text-xl font-bold text-[#3B82F6]'>{totalConversions.toLocaleString()}</p></CardContent></Card>
        <Card className='bg-[#111827] border-[#1E293B]'><CardContent className='p-3'><p className='text-xs text-[#94A3B8]'>Avg ROAS</p><p className='text-xl font-bold text-[#F59E0B]'>{avgROAS.toFixed(1)}x</p></CardContent></Card>
      </div>

      <Card className='bg-[#111827] border-[#1E293B]'>
        <CardHeader className='pb-2'><CardTitle className='text-sm'>Attribution Overview</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className='border-[#1E293B]'><TableHead className='text-[#94A3B8] text-xs'>Channel</TableHead><TableHead className='text-[#94A3B8] text-xs'>Impressions</TableHead><TableHead className='text-[#94A3B8] text-xs'>Clicks</TableHead><TableHead className='text-[#94A3B8] text-xs'>Conv.</TableHead><TableHead className='text-[#94A3B8] text-xs'>CTR</TableHead><TableHead className='text-[#94A3B8] text-xs'>CPA</TableHead><TableHead className='text-[#94A3B8] text-xs'>ROAS</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.filter(c => c.status === 'active').map(c => (
                <TableRow key={c.id} className='border-[#1E293B]'>
                  <TableCell className='text-xs text-[#F1F5F9]'>{c.name}</TableCell>
                  <TableCell className='text-xs text-[#94A3B8]'>{c.impressions.toLocaleString()}</TableCell>
                  <TableCell className='text-xs text-[#94A3B8]'>{c.clicks.toLocaleString()}</TableCell>
                  <TableCell className='text-xs text-[#94A3B8]'>{c.conversions}</TableCell>
                  <TableCell className='text-xs text-[#00D4AA]'>{c.ctr.toFixed(2)}%</TableCell>
                  <TableCell className='text-xs text-[#94A3B8]'>${c.cpc > 0 ? (c.spend / c.conversions).toFixed(2) : '0.00'}</TableCell>
                  <TableCell className='text-xs font-semibold text-[#F59E0B]'>{c.roas}x</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
