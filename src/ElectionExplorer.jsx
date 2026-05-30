import React, { useState, useMemo, useEffect } from 'react';
import { Search, TrendingUp, Users, MapPin, Award, BarChart3, Filter, X } from 'lucide-react';
import * as Papa from 'papaparse';

const ElectionExplorer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedConstituency, setSelectedConstituency] = useState(null);
  const [viewMode, setViewMode] = useState('search'); // 'search', 'close-races', 'party-analysis'
  const [filterMargin, setFilterMargin] = useState(10000);
  const [electionData, setElectionData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load CSV data
  useEffect(() => {
    fetch('/GE_2024_Results_new.csv')
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const processed = results.data.map(row => ({
              ...row,
              'Total Votes': parseInt((row['Total Votes'] || '0').replace(/,/g, '')) || 0,
              '% of Votes': parseFloat(row['% of Votes']) || 0
            }));
            setElectionData(processed);
            setLoading(false);
          }
        });
      })
      .catch(error => {
        console.error('Error loading data:', error);
        setLoading(false);
      });
  }, []);

  // Group by constituency
  const constituencies = useMemo(() => {
    const grouped = {};
    electionData.forEach(row => {
      const key = `${row.State}|||${row.Constituency}`;
      if (!grouped[key]) {
        grouped[key] = {
          state: row.State,
          constituency: row.Constituency,
          candidates: []
        };
      }
      grouped[key].candidates.push(row);
    });
    
    // Sort candidates by votes and calculate margins
    Object.values(grouped).forEach(c => {
      c.candidates.sort((a, b) => b['Total Votes'] - a['Total Votes']);
      if (c.candidates.length >= 2) {
        c.winner = c.candidates[0];
        c.runnerUp = c.candidates[1];
        c.margin = c.winner['Total Votes'] - c.runnerUp['Total Votes'];
        c.marginPercent = c.winner['% of Votes'] - c.runnerUp['% of Votes'];
      }
      c.totalVotes = c.candidates.reduce((sum, cand) => sum + cand['Total Votes'], 0);
    });
    
    return Object.values(grouped);
  }, [electionData]);

  // Get unique states
  const states = useMemo(() => {
    return [...new Set(electionData.map(r => r.State))].sort();
  }, [electionData]);

  // Filter constituencies
  const filteredConstituencies = useMemo(() => {
    let filtered = constituencies;
    
    if (selectedState !== 'all') {
      filtered = filtered.filter(c => c.state === selectedState);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.constituency.toLowerCase().includes(term) ||
        c.state.toLowerCase().includes(term) ||
        c.candidates.some(cand => 
          cand.Candidate.toLowerCase().includes(term) ||
          cand.Party.toLowerCase().includes(term)
        )
      );
    }
    
    return filtered;
  }, [constituencies, selectedState, searchTerm]);

  // Close races
  const closeRaces = useMemo(() => {
    return constituencies
      .filter(c => c.margin && c.margin < filterMargin)
      .sort((a, b) => a.margin - b.margin);
  }, [constituencies, filterMargin]);

  // Party analysis
  const partyStats = useMemo(() => {
    const stats = {};
    constituencies.forEach(c => {
      if (c.winner) {
        const party = c.winner.Party;
        if (!stats[party]) {
          stats[party] = { wins: 0, totalVotes: 0, constituencies: [] };
        }
        stats[party].wins++;
        stats[party].totalVotes += c.winner['Total Votes'];
        stats[party].constituencies.push(c);
      }
    });
    return Object.entries(stats)
      .map(([party, data]) => ({ party, ...data }))
      .sort((a, b) => b.wins - a.wins);
  }, [constituencies]);

  const ConstituencyCard = ({ constituency }) => {
    const { winner, runnerUp, margin, marginPercent, totalVotes, candidates } = constituency;
    const isClose = margin < 10000;
    
    return (
      <div 
        className="constituency-card"
        onClick={() => setSelectedConstituency(constituency)}
      >
        <div className="card-header">
          <div>
            <h3>{constituency.constituency}</h3>
            <p className="state-label">{constituency.state}</p>
          </div>
          {isClose && <span className="close-race-badge">Close Race</span>}
        </div>
        
        {winner && (
          <>
            <div className="winner-section">
              <div className="winner-info">
                <Award className="trophy-icon" />
                <div>
                  <div className="candidate-name">{winner.Candidate}</div>
                  <div className="party-name">{winner.Party}</div>
                </div>
              </div>
              <div className="vote-stats">
                <div className="votes">{winner['Total Votes'].toLocaleString()}</div>
                <div className="percentage">{winner['% of Votes'].toFixed(2)}%</div>
              </div>
            </div>
            
            {runnerUp && (
              <div className="margin-display">
                <div className="margin-bar">
                  <div 
                    className="margin-fill" 
                    style={{ width: `${Math.min(marginPercent * 3, 100)}%` }}
                  />
                </div>
                <div className="margin-text">
                  Won by <strong>{margin.toLocaleString()}</strong> votes ({marginPercent.toFixed(2)}%)
                </div>
              </div>
            )}
            
            <div className="runner-up">
              <div>
                <div className="candidate-name-small">{runnerUp?.Candidate}</div>
                <div className="party-name-small">{runnerUp?.Party}</div>
              </div>
              <div className="votes-small">{runnerUp?.['Total Votes'].toLocaleString()}</div>
            </div>
          </>
        )}
      </div>
    );
  };

  const ConstituencyModal = ({ constituency, onClose }) => {
    if (!constituency) return null;
    
    const maxVotes = constituency.candidates[0]['Total Votes'];
    
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>
            <X />
          </button>
          
          <div className="modal-header">
            <h2>{constituency.constituency}</h2>
            <p className="modal-state">{constituency.state}</p>
          </div>
          
          <div className="modal-stats">
            <div className="stat-box">
              <Users />
              <div>
                <div className="stat-value">{constituency.totalVotes.toLocaleString()}</div>
                <div className="stat-label">Total Votes</div>
              </div>
            </div>
            <div className="stat-box">
              <TrendingUp />
              <div>
                <div className="stat-value">{constituency.candidates.length}</div>
                <div className="stat-label">Candidates</div>
              </div>
            </div>
          </div>
          
          <div className="candidates-list">
            {constituency.candidates.map((cand, idx) => (
              <div key={idx} className={`candidate-row ${cand.Result === 'Won' ? 'winner-row' : ''}`}>
                <div className="candidate-rank">{idx + 1}</div>
                <div className="candidate-details">
                  <div className="candidate-name-large">{cand.Candidate}</div>
                  <div className="party-name-large">{cand.Party}</div>
                </div>
                <div className="candidate-votes">
                  <div className="vote-bar-container">
                    <div 
                      className="vote-bar" 
                      style={{ width: `${(cand['Total Votes'] / maxVotes) * 100}%` }}
                    />
                  </div>
                  <div className="vote-numbers">
                    <span className="votes-large">{cand['Total Votes'].toLocaleString()}</span>
                    <span className="percentage-large">{cand['% of Votes'].toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="election-explorer">
      {loading ? (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <h2>Loading Election Data...</h2>
          <p>Processing 541 constituencies across India</p>
        </div>
      ) : (
        <>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="title-section">
            <h1>India General Election 2024</h1>
            <p className="subtitle">Complete constituency-wise results across {states.length} states and {constituencies.length} constituencies</p>
          </div>
          
          <div className="view-tabs">
            <button 
              className={viewMode === 'search' ? 'tab-active' : 'tab'}
              onClick={() => setViewMode('search')}
            >
              <Search size={18} />
              Search
            </button>
            <button 
              className={viewMode === 'close-races' ? 'tab-active' : 'tab'}
              onClick={() => setViewMode('close-races')}
            >
              <TrendingUp size={18} />
              Close Races
            </button>
            <button 
              className={viewMode === 'party-analysis' ? 'tab-active' : 'tab'}
              onClick={() => setViewMode('party-analysis')}
            >
              <BarChart3 size={18} />
              Party Analysis
            </button>
          </div>
        </div>
      </header>

      {/* Search View */}
      {viewMode === 'search' && (
        <div className="search-view">
          <div className="search-controls">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search constituencies, candidates, or parties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)}
              className="state-select"
            >
              <option value="all">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          
          <div className="results-count">
            Showing {filteredConstituencies.length} constituencies
          </div>
          
          <div className="cards-grid">
            {filteredConstituencies.map((c, idx) => (
              <ConstituencyCard key={idx} constituency={c} />
            ))}
          </div>
        </div>
      )}

      {/* Close Races View */}
      {viewMode === 'close-races' && (
        <div className="close-races-view">
          <div className="filter-control">
            <label>Show races decided by less than:</label>
            <select 
              value={filterMargin} 
              onChange={(e) => setFilterMargin(Number(e.target.value))}
              className="margin-select"
            >
              <option value="5000">5,000 votes</option>
              <option value="10000">10,000 votes</option>
              <option value="25000">25,000 votes</option>
              <option value="50000">50,000 votes</option>
            </select>
          </div>
          
          <div className="results-count">
            {closeRaces.length} close races found
          </div>
          
          <div className="cards-grid">
            {closeRaces.map((c, idx) => (
              <ConstituencyCard key={idx} constituency={c} />
            ))}
          </div>
        </div>
      )}

      {/* Party Analysis View */}
      {viewMode === 'party-analysis' && (
        <div className="party-view">
          <div className="party-list">
            {partyStats.slice(0, 20).map((party, idx) => (
              <div key={idx} className="party-card">
                <div className="party-rank">#{idx + 1}</div>
                <div className="party-info">
                  <div className="party-name-big">{party.party}</div>
                  <div className="party-metrics">
                    <span><Award size={14} /> {party.wins} seats won</span>
                    <span><Users size={14} /> {party.totalVotes.toLocaleString()} total votes</span>
                  </div>
                </div>
                <div className="party-bar-container">
                  <div 
                    className="party-bar" 
                    style={{ width: `${(party.wins / constituencies.length) * 100 * 5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedConstituency && (
        <ConstituencyModal 
          constituency={selectedConstituency} 
          onClose={() => setSelectedConstituency(null)} 
        />
      )}
      </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Work+Sans:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .election-explorer {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8f4ed 0%, #ede5d8 100%);
          font-family: 'Work Sans', sans-serif;
          color: #1a1511;
        }
        
        /* Loading Screen */
        .loading-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
        }
        
        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #e8dcc8;
          border-top: 4px solid #d4a574;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .loading-screen h2 {
          font-family: 'Crimson Pro', serif;
          font-size: 2rem;
          font-weight: 700;
          color: #2d1810;
        }
        
        .loading-screen p {
          color: #6b5d52;
          font-size: 1.1rem;
        }
        
        /* Header */
        .header {
          background: linear-gradient(135deg, #2d1810 0%, #4a2818 100%);
          color: #f8f4ed;
          padding: 3rem 2rem;
          border-bottom: 4px solid #d4a574;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .header-content {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .title-section h1 {
          font-family: 'Crimson Pro', serif;
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          letter-spacing: -0.5px;
          text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
        }
        
        .subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          font-weight: 400;
        }
        
        .view-tabs {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .tab, .tab-active {
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.2);
          color: #f8f4ed;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }
        
        .tab:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.4);
          transform: translateY(-2px);
        }
        
        .tab-active {
          background: #d4a574;
          border-color: #d4a574;
          color: #2d1810;
        }
        
        /* Search View */
        .search-view, .close-races-view, .party-view {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          animation: fadeIn 0.6s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .search-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .search-box {
          flex: 1;
          position: relative;
        }
        
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b5d52;
          opacity: 0.5;
        }
        
        .search-box input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 2px solid #d4a574;
          border-radius: 12px;
          font-size: 1.05rem;
          background: white;
          font-family: 'Work Sans', sans-serif;
          transition: all 0.3s ease;
        }
        
        .search-box input:focus {
          outline: none;
          border-color: #4a2818;
          box-shadow: 0 4px 16px rgba(74, 40, 24, 0.15);
        }
        
        .state-select, .margin-select {
          padding: 1rem 1.5rem;
          border: 2px solid #d4a574;
          border-radius: 12px;
          font-size: 1.05rem;
          background: white;
          font-family: 'Work Sans', sans-serif;
          cursor: pointer;
          font-weight: 500;
          min-width: 200px;
        }
        
        .results-count {
          font-size: 0.95rem;
          color: #6b5d52;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }
        
        /* Cards Grid */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }
        
        .constituency-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 2px solid #e8dcc8;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: slideUp 0.5s ease;
          animation-fill-mode: both;
        }
        
        .constituency-card:nth-child(1) { animation-delay: 0.05s; }
        .constituency-card:nth-child(2) { animation-delay: 0.1s; }
        .constituency-card:nth-child(3) { animation-delay: 0.15s; }
        .constituency-card:nth-child(4) { animation-delay: 0.2s; }
        .constituency-card:nth-child(5) { animation-delay: 0.25s; }
        .constituency-card:nth-child(6) { animation-delay: 0.3s; }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .constituency-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(74, 40, 24, 0.15);
          border-color: #d4a574;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f8f4ed;
        }
        
        .card-header h3 {
          font-family: 'Crimson Pro', serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #2d1810;
          margin-bottom: 0.25rem;
        }
        
        .state-label {
          font-size: 0.9rem;
          color: #6b5d52;
          font-weight: 500;
        }
        
        .close-race-badge {
          background: #ff6b6b;
          color: white;
          padding: 0.3rem 0.7rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .winner-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #fff9f0 0%, #fef5e7 100%);
          border-radius: 8px;
          border-left: 4px solid #d4a574;
        }
        
        .winner-info {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }
        
        .trophy-icon {
          color: #d4a574;
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .candidate-name {
          font-weight: 700;
          font-size: 1.05rem;
          color: #2d1810;
          margin-bottom: 0.25rem;
        }
        
        .party-name {
          font-size: 0.85rem;
          color: #6b5d52;
          font-weight: 500;
        }
        
        .vote-stats {
          text-align: right;
        }
        
        .votes {
          font-size: 1.3rem;
          font-weight: 700;
          color: #2d1810;
        }
        
        .percentage {
          font-size: 0.9rem;
          color: #6b5d52;
          font-weight: 600;
        }
        
        .margin-display {
          margin-bottom: 1rem;
        }
        
        .margin-bar {
          height: 6px;
          background: #f0e6d8;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        
        .margin-fill {
          height: 100%;
          background: linear-gradient(90deg, #d4a574 0%, #b88a5e 100%);
          transition: width 0.8s ease;
        }
        
        .margin-text {
          font-size: 0.85rem;
          color: #6b5d52;
        }
        
        .margin-text strong {
          color: #2d1810;
          font-weight: 700;
        }
        
        .runner-up {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #fafaf8;
          border-radius: 6px;
        }
        
        .candidate-name-small {
          font-weight: 600;
          font-size: 0.95rem;
          color: #2d1810;
          margin-bottom: 0.2rem;
        }
        
        .party-name-small {
          font-size: 0.8rem;
          color: #6b5d52;
        }
        
        .votes-small {
          font-weight: 600;
          color: #6b5d52;
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(26, 21, 17, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
          animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 800px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          padding: 2rem;
          animation: slideUp 0.4s ease;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
        }
        
        .modal-close {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: #f8f4ed;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .modal-close:hover {
          background: #2d1810;
          color: white;
          transform: rotate(90deg);
        }
        
        .modal-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e8dcc8;
        }
        
        .modal-header h2 {
          font-family: 'Crimson Pro', serif;
          font-size: 2.2rem;
          font-weight: 700;
          color: #2d1810;
          margin-bottom: 0.5rem;
        }
        
        .modal-state {
          font-size: 1.1rem;
          color: #6b5d52;
          font-weight: 500;
        }
        
        .modal-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .stat-box {
          background: linear-gradient(135deg, #fff9f0 0%, #fef5e7 100%);
          padding: 1.25rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 2px solid #f0e6d8;
        }
        
        .stat-box svg {
          color: #d4a574;
          flex-shrink: 0;
        }
        
        .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #2d1810;
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: #6b5d52;
          font-weight: 500;
        }
        
        .candidates-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .candidate-row {
          display: grid;
          grid-template-columns: 40px 1fr 1fr;
          gap: 1rem;
          align-items: center;
          padding: 1rem;
          background: #fafaf8;
          border-radius: 8px;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }
        
        .candidate-row:hover {
          background: #f8f4ed;
          border-color: #e8dcc8;
        }
        
        .winner-row {
          background: linear-gradient(135deg, #fff9f0 0%, #fef5e7 100%);
          border-color: #d4a574;
        }
        
        .candidate-rank {
          font-size: 1.3rem;
          font-weight: 700;
          color: #d4a574;
          text-align: center;
        }
        
        .candidate-name-large {
          font-weight: 700;
          font-size: 1.05rem;
          color: #2d1810;
          margin-bottom: 0.25rem;
        }
        
        .party-name-large {
          font-size: 0.85rem;
          color: #6b5d52;
        }
        
        .candidate-votes {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .vote-bar-container {
          height: 8px;
          background: #e8dcc8;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .vote-bar {
          height: 100%;
          background: linear-gradient(90deg, #d4a574 0%, #b88a5e 100%);
          transition: width 0.8s ease;
        }
        
        .vote-numbers {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .votes-large {
          font-weight: 700;
          color: #2d1810;
        }
        
        .percentage-large {
          font-weight: 600;
          color: #6b5d52;
          font-size: 0.9rem;
        }
        
        /* Filter Control */
        .filter-control {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .filter-control label {
          font-weight: 600;
          color: #2d1810;
        }
        
        /* Party View */
        .party-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .party-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 2px solid #e8dcc8;
          display: grid;
          grid-template-columns: 60px 1fr auto;
          gap: 1.5rem;
          align-items: center;
          transition: all 0.3s ease;
          animation: slideUp 0.5s ease;
          animation-fill-mode: both;
        }
        
        .party-card:nth-child(1) { animation-delay: 0.05s; }
        .party-card:nth-child(2) { animation-delay: 0.1s; }
        .party-card:nth-child(3) { animation-delay: 0.15s; }
        .party-card:nth-child(4) { animation-delay: 0.2s; }
        .party-card:nth-child(5) { animation-delay: 0.25s; }
        
        .party-card:hover {
          transform: translateX(4px);
          border-color: #d4a574;
          box-shadow: 0 4px 16px rgba(74, 40, 24, 0.1);
        }
        
        .party-rank {
          font-size: 2rem;
          font-weight: 700;
          color: #d4a574;
          text-align: center;
          font-family: 'Crimson Pro', serif;
        }
        
        .party-name-big {
          font-weight: 700;
          font-size: 1.2rem;
          color: #2d1810;
          margin-bottom: 0.5rem;
        }
        
        .party-metrics {
          display: flex;
          gap: 1.5rem;
          font-size: 0.9rem;
          color: #6b5d52;
        }
        
        .party-metrics span {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        
        .party-bar-container {
          width: 200px;
          height: 8px;
          background: #f0e6d8;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .party-bar {
          height: 100%;
          background: linear-gradient(90deg, #d4a574 0%, #b88a5e 100%);
          transition: width 0.8s ease;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .header {
            padding: 2rem 1rem;
          }
          
          .title-section h1 {
            font-size: 2.2rem;
          }
          
          .subtitle {
            font-size: 0.95rem;
          }
          
          .view-tabs {
            flex-wrap: wrap;
          }
          
          .cards-grid {
            grid-template-columns: 1fr;
          }
          
          .search-controls {
            flex-direction: column;
          }
          
          .party-card {
            grid-template-columns: 50px 1fr;
            gap: 1rem;
          }
          
          .party-bar-container {
            display: none;
          }
          
          .candidate-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          
          .candidate-rank {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ElectionExplorer;