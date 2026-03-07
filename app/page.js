'use client';

import './globals.css';
import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import campaignData from '../data/sample-data.json';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4ade80', '#fbbf24', '#f87171'];

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toLocaleString('pt-BR');
}

function formatPercent(value) {
  return value.toFixed(2) + '%';
}

function getRecommendations(campaigns) {
  const recs = [];

  for (const c of campaigns) {
    const m = c.metrics;

    // CPA alto
    if (m.cost_per_conversion > 100 && c.objective !== 'OUTCOME_AWARENESS') {
      recs.push({
        campaign: c.name,
        priority: 'high',
        text: `CPA de ${formatCurrency(m.cost_per_conversion)} está muito elevado. Revise o público-alvo e os criativos. Considere testar audiências lookalike ou refinar a segmentação para reduzir o custo por conversão.`,
        metric: `CPA: ${formatCurrency(m.cost_per_conversion)} | Conversões: ${m.conversions}`
      });
    }

    // CTR baixo
    if (m.ctr < 1.5) {
      recs.push({
        campaign: c.name,
        priority: 'high',
        text: `CTR de ${formatPercent(m.ctr)} está abaixo da média do mercado (1.5-3%). Teste novos criativos com CTAs mais fortes, use formatos carrossel ou vídeo curto para aumentar o engajamento.`,
        metric: `CTR: ${formatPercent(m.ctr)} | Cliques: ${formatNumber(m.clicks)}`
      });
    }

    // Frequência alta
    if (m.frequency > 3) {
      recs.push({
        campaign: c.name,
        priority: 'medium',
        text: `Frequência de ${m.frequency.toFixed(1)}x indica saturação do público. Expanda a audiência ou rode novos criativos para evitar ad fatigue e queda de performance.`,
        metric: `Frequência: ${m.frequency.toFixed(1)}x | Alcance: ${formatNumber(m.reach)}`
      });
    }

    // CPC alto
    if (m.cpc > 3.5) {
      recs.push({
        campaign: c.name,
        priority: 'medium',
        text: `CPC de ${formatCurrency(m.cpc)} está acima da média. Otimize os anúncios para relevância: melhore o Quality Ranking com criativos mais alinhados ao público.`,
        metric: `CPC: ${formatCurrency(m.cpc)} | Gasto Total: ${formatCurrency(m.spend)}`
      });
    }

    // Campanha pausada com gasto alto
    if (c.status === 'PAUSED' && m.spend > 30000) {
      recs.push({
        campaign: c.name,
        priority: 'medium',
        text: `Campanha pausada com ${formatCurrency(m.spend)} investidos. Analise os resultados e decida: reativar com ajustes no público e criativos, ou redistribuir o orçamento para campanhas com melhor ROAS.`,
        metric: `Investimento: ${formatCurrency(m.spend)} | ${formatNumber(m.impressions)} impressões`
      });
    }

    // Boa performance de leads
    if (c.objective === 'OUTCOME_LEADS' && m.cost_per_conversion < 50) {
      recs.push({
        campaign: c.name,
        priority: 'low',
        text: `Excelente CPL de ${formatCurrency(m.cost_per_conversion)}! Considere aumentar o orçamento diário em 20-30% para escalar os resultados mantendo a eficiência.`,
        metric: `CPL: ${formatCurrency(m.cost_per_conversion)} | Leads: ${m.conversions}`
      });
    }

    // Bom engajamento
    if (c.objective === 'OUTCOME_ENGAGEMENT' && m.cpm < 30) {
      recs.push({
        campaign: c.name,
        priority: 'low',
        text: `CPM baixo de ${formatCurrency(m.cpm)} com alto engajamento. Continue investindo em Reels - é o formato com melhor custo-benefício. Teste variações do conteúdo top performer.`,
        metric: `CPM: ${formatCurrency(m.cpm)} | Engajamento: ${formatNumber(m.actions?.post_engagement || 0)}`
      });
    }

    // Conversão boa
    if (c.objective === 'OUTCOME_SALES' && m.cost_per_conversion < 60) {
      recs.push({
        campaign: c.name,
        priority: 'low',
        text: `CPA de vendas de ${formatCurrency(m.cost_per_conversion)} está eficiente. Escale gradualmente (+15% ao dia) e monitore se o CPA se mantém. Teste retargeting para visitantes que não converteram.`,
        metric: `CPA: ${formatCurrency(m.cost_per_conversion)} | Vendas: ${m.conversions}`
      });
    }

    // Awareness sem conversões
    if (c.objective === 'OUTCOME_AWARENESS' && m.conversions < 100 && m.spend > 40000) {
      recs.push({
        campaign: c.name,
        priority: 'high',
        text: `Alto investimento (${formatCurrency(m.spend)}) em awareness com apenas ${m.conversions} conversões. Considere migrar parte do orçamento para campanhas de conversão ou criar um funil com retargeting do público alcançado.`,
        metric: `Investido: ${formatCurrency(m.spend)} | Alcance: ${formatNumber(m.reach)} | Conversões: ${m.conversions}`
      });
    }
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const { campaigns } = campaignData;

  // Aggregate KPIs
  const totals = campaigns.reduce((acc, c) => ({
    spend: acc.spend + c.metrics.spend,
    impressions: acc.impressions + c.metrics.impressions,
    reach: acc.reach + c.metrics.reach,
    clicks: acc.clicks + c.metrics.clicks,
    conversions: acc.conversions + c.metrics.conversions,
  }), { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0 });

  const avgCPC = totals.spend / totals.clicks;
  const avgCTR = (totals.clicks / totals.impressions) * 100;
  const avgCPM = (totals.spend / totals.impressions) * 1000;
  const avgCPA = totals.spend / totals.conversions;

  // Pie chart data
  const spendByObjective = campaigns.map(c => ({
    name: c.name.replace('Campanha ', '').split(' - ')[0],
    value: c.metrics.spend
  }));

  // Comparison bar chart
  const comparisonData = campaigns.map(c => ({
    name: c.name.replace('Campanha ', '').split(' - ')[0],
    CPC: c.metrics.cpc,
    CTR: c.metrics.ctr,
    CPA: c.metrics.cost_per_conversion / 10,
  }));

  // Combined daily chart
  const dailyMap = {};
  campaigns.filter(c => c.daily_data[0]?.date.startsWith('2025-12')).forEach(c => {
    c.daily_data.forEach(d => {
      if (!dailyMap[d.date]) dailyMap[d.date] = { date: d.date.slice(5), spend: 0, clicks: 0, conversions: 0, impressions: 0 };
      dailyMap[d.date].spend += d.spend;
      dailyMap[d.date].clicks += d.clicks;
      dailyMap[d.date].conversions += d.conversions;
      dailyMap[d.date].impressions += d.impressions;
    });
  });
  const dailyTotals = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  const recommendations = getRecommendations(campaigns);

  const customTooltipStyle = {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2d2d44',
    borderRadius: '8px',
    padding: '12px',
    color: '#e2e8f0',
    fontSize: '12px',
  };

  return (
    <div className="dashboard">
      <div className="header">
        <div>
          <h1>Meta Ads Dashboard</h1>
          <div className="subtitle">Instagram Campaign Analytics - {campaignData.account.name}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', color: '#94a3b8' }}>
          <div>Moeda: {campaignData.account.currency}</div>
          <div>{campaigns.length} campanhas analisadas</div>
        </div>
      </div>

      <div className="note-box">
        <strong>Nota:</strong> Os dados exibidos são de exemplo (a API graph.facebook.com não está acessível neste ambiente).
        Para carregar dados reais, execute: <code>META_ACCESS_TOKEN=seu_token npm run fetch-data</code>
      </div>

      <div className="tabs">
        {[
          ['overview', 'Visão Geral'],
          ['campaigns', 'Campanhas'],
          ['recommendations', 'Recomendações'],
        ].map(([key, label]) => (
          <button key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="label">Investimento Total</div>
              <div className="value">{formatCurrency(totals.spend)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">Impressões</div>
              <div className="value">{formatNumber(totals.impressions)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">Alcance</div>
              <div className="value">{formatNumber(totals.reach)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">Cliques</div>
              <div className="value">{formatNumber(totals.clicks)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">Conversões</div>
              <div className="value">{formatNumber(totals.conversions)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">CPC Médio</div>
              <div className="value">{formatCurrency(avgCPC)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">CTR Médio</div>
              <div className="value">{formatPercent(avgCTR)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">CPM Médio</div>
              <div className="value">{formatCurrency(avgCPM)}</div>
            </div>
            <div className="kpi-card">
              <div className="label">CPA Médio</div>
              <div className="value">{formatCurrency(avgCPA)}</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Investimento Diário (Dez/2025)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyTotals}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(v) => [formatCurrency(v), 'Gasto']} />
                  <Area type="monotone" dataKey="spend" stroke="#667eea" fill="url(#colorSpend)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Distribuição de Investimento por Campanha</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={spendByObjective} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {spendByObjective.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} formatter={(v) => [formatCurrency(v), 'Investido']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Cliques e Conversões Diários (Dez/2025)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#667eea" strokeWidth={2} name="Cliques" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#4ade80" strokeWidth={2} name="Conversões" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Comparativo de Métricas por Campanha</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend />
                  <Bar dataKey="CPC" fill="#667eea" name="CPC (R$)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CTR" fill="#4ade80" name="CTR (%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CPA" fill="#f093fb" name="CPA (R$/10)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeTab === 'campaigns' && (
        <div className="section">
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="campaign-table">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Status</th>
                  <th>Objetivo</th>
                  <th>Investido</th>
                  <th>Impressões</th>
                  <th>Cliques</th>
                  <th>CTR</th>
                  <th>CPC</th>
                  <th>CPM</th>
                  <th>Conversões</th>
                  <th>CPA</th>
                  <th>Frequência</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} onClick={() => setSelectedCampaign(selectedCampaign === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500, maxWidth: 200 }}>{c.name}</td>
                    <td><span className={`status-badge ${c.status.toLowerCase()}`}>{c.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}</span></td>
                    <td style={{ fontSize: 12 }}>{c.objective.replace('OUTCOME_', '')}</td>
                    <td>{formatCurrency(c.metrics.spend)}</td>
                    <td>{formatNumber(c.metrics.impressions)}</td>
                    <td>{formatNumber(c.metrics.clicks)}</td>
                    <td style={{ color: c.metrics.ctr >= 2 ? '#4ade80' : c.metrics.ctr >= 1 ? '#fbbf24' : '#f87171' }}>{formatPercent(c.metrics.ctr)}</td>
                    <td>{formatCurrency(c.metrics.cpc)}</td>
                    <td>{formatCurrency(c.metrics.cpm)}</td>
                    <td>{formatNumber(c.metrics.conversions)}</td>
                    <td style={{ color: c.metrics.cost_per_conversion <= 60 ? '#4ade80' : c.metrics.cost_per_conversion <= 150 ? '#fbbf24' : '#f87171' }}>{formatCurrency(c.metrics.cost_per_conversion)}</td>
                    <td style={{ color: c.metrics.frequency <= 2.5 ? '#4ade80' : '#fbbf24' }}>{c.metrics.frequency.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedCampaign && (() => {
            const camp = campaigns.find(c => c.id === selectedCampaign);
            if (!camp) return null;
            return (
              <div className="card">
                <h3 style={{ marginBottom: 16, color: '#f1f5f9' }}>{camp.name} - Evolução Diária</h3>
                <div className="charts-grid">
                  <div>
                    <h4 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>Gasto vs Conversões</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={camp.daily_data.map(d => ({ ...d, date: d.date.slice(5) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#667eea" name="Gasto (R$)" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#4ade80" name="Conversões" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>Impressões vs Cliques</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={camp.daily_data.map(d => ({ ...d, date: d.date.slice(5) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Legend />
                        <Bar dataKey="impressions" fill="#764ba2" name="Impressões" opacity={0.6} />
                        <Bar dataKey="clicks" fill="#667eea" name="Cliques" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>Ações Detalhadas</h4>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {Object.entries(camp.metrics.actions).map(([key, val]) => (
                      <div key={key} style={{ background: '#16162a', padding: '8px 16px', borderRadius: 8, fontSize: 13 }}>
                        <span style={{ color: '#94a3b8' }}>{key.replace(/_/g, ' ')}: </span>
                        <span style={{ fontWeight: 600 }}>{formatNumber(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="section">
          <div className="section-title">Recomendações Estratégicas ({recommendations.length})</div>
          {recommendations.map((rec, i) => (
            <div key={i} className={`recommendation ${rec.priority}`}>
              <div className="rec-header">
                <span className="rec-campaign">{rec.campaign}</span>
                <span className="rec-priority">
                  {rec.priority === 'high' ? 'Alta Prioridade' : rec.priority === 'medium' ? 'Média Prioridade' : 'Oportunidade'}
                </span>
              </div>
              <div className="rec-text">{rec.text}</div>
              <div className="rec-metric">{rec.metric}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 12, borderTop: '1px solid #1e293b', marginTop: 24 }}>
        Meta Ads Dashboard | Dados via Meta Graph API v21.0
      </div>
    </div>
  );
}
