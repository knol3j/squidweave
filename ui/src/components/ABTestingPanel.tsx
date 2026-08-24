import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Columns, ArrowRight, Zap, TrendingUp,
  BarChart3, Rocket, Users, Smartphone, Activity,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dataService, type Variation } from '../services/dataService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ABTestingPanel: React.FC = () => {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(95);

  useEffect(() => {
    setVariations(dataService.getVariations());
  }, []);

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const updatedVariations = dataService.simulateABTest(selectedCampaign || undefined);
      setVariations(updatedVariations);
      setIsSimulating(false);
    }, 1500);
  };

  const getWinner = () => {
    if (variations.length === 0) return null;
    return variations.reduce((prev, current) => (prev.conversionRate > current.conversionRate) ? prev : current);
  };

  const winner = getWinner();

  const chartData = variations.map(v => ({
    name: v.name,
    conversionRate: v.conversionRate,
    impressions: v.impressions,
    clicks: v.clicks,
    fill: v.isWinner ? '#10B981' : v.isControl ? '#3B82F6' : '#8B5CF6'
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Columns className="w-6 h-6 text-blue-400" />
            A/B Testing Laboratory
          </h2>
          <p className="text-slate-400 mt-1">Simulate and analyze campaign variations</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700">
            <Activity className="w-3 h-3 mr-1" />
            {confidence}% Confidence
          </Badge>
          <Button
            onClick={runSimulation}
            disabled={isSimulating}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
          >
            {isSimulating ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Simulating...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Run Simulation
              </>
            )}
          </Button>
        </div>
      </div>

      {variations.length > 0 && winner && (
        <Card className="bg-gradient-to-r from-emerald-900/30 to-slate-900 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Winner: {winner.name}</h3>
                  <p className="text-emerald-400">
                    {(winner.conversionRate * 100).toFixed(2)}% conversion rate
                    {winner.lift > 0 && ` (+${winner.lift.toFixed(1)}% lift)`}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                <ArrowRight className="w-4 h-4 mr-2" />
                Apply Winner
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Conversion Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
                />
                <Bar dataKey="conversionRate" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Users className="w-5 h-5 text-blue-400" />
              Variation Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {variations.map((variation) => (
                <motion.div
                  key={variation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-lg border ${
                    variation.isWinner
                      ? 'bg-emerald-900/20 border-emerald-500/30'
                      : variation.isControl
                      ? 'bg-blue-900/20 border-blue-500/30'
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        variation.isWinner ? 'bg-emerald-400' : variation.isControl ? 'bg-blue-400' : 'bg-purple-400'
                      }`} />
                      <span className="font-medium text-white">{variation.name}</span>
                      {variation.isControl && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          Control
                        </Badge>
                      )}
                      {variation.isWinner && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          Winner
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-slate-400">
                      {(variation.conversionRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-slate-400 mt-2">
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      {variation.impressions.toLocaleString()} impressions
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {variation.clicks.toLocaleString()} clicks
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {variation.conversions.toLocaleString()} conversions
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ABTestingPanel;
