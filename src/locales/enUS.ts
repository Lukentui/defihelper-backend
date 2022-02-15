/* eslint-disable no-template-curly-in-string */
export default {
  plural: (n: number) => (n === 1 ? 0 : 1),
  messages: {
    '_date': 'MMM DD YYYY',
    '_time': 'HH:mm:ss',
    '_dateTime': 'MMM DD YYYY HH:mm:ss',
    'hello world': 'hello world',
    'dollar': ['dollar', 'dollars'],
    'Confirm': 'Confirm',
    'New {{eventName}} events in {{contractAddress}} on {{network}}:':
      'New {{eventName}} events in {{contractAddress}} on {{network}}:',
    'Your portfolio: total stacked ${{totalStackedUSD}}, total earned ${{totalEarnedUSD}}':
      'Your portfolio: total stacked ${{totalStackedUSD}}, total earned ${{totalEarnedUSD}}',
    'Attention, one of yours automates may be paused due to insufficient funds':
      'Attention, one of yours automates may be paused due to insufficient funds',
    "DeFiHelper's public beta now available. Get your APY boost right now on https://app.defihelper.io!":
      "DeFiHelper's public beta now available. Get your APY boost right now on https://app.defihelper.io!",
    'Tracked Balance ${{totalNetWorth}}, Total unclaimed ${{totalEarnedUSD}}':
      'Tracked Balance ${{totalNetWorth}}, Total unclaimed ${{totalEarnedUSD}}',
    'automate:trigger:contractEvent:name': 'Contract event',
    'automate:trigger:contractEvent:description': 'Call trigger for contract event',
    'automate:trigger:everyMonth:name': 'Periodic',
    'automate:trigger:everyMonth:description': 'Call trigger every month',
    'automate:trigger:everyWeek:name': 'Periodic',
    'automate:trigger:everyWeek:description': 'Call trigger every week',
    'automate:trigger:everyDay:name': 'Periodic',
    'automate:trigger:everyDay:description': 'Call trigger every day',
    'automate:trigger:everyHour:name': 'Periodic',
    'automate:trigger:everyHour:description': 'Call trigger every hour',
    'automate:action:notification:paramsDescription': 'Send notification to {{contactId}}',
    'automate:action:ethereumAutomateRun:paramsDescription': 'Run automate {{id}}',
    'automate:condition:ethereumBalance:name': 'Native Token Balance',
    'automate:condition:ethereumBalance:description':
      'Check native token balance (ETH, BNB, AVAX etc.)',
    'automate:condition:ethereumBalance:paramsDescription':
      'Wallet balance {{wallet}} in network {{network}} {{op}} {{value}}',
    'automate:condition:ethereumOptimalAutomateRun:name': 'Optimized Staking',
    'automate:condition:ethereumOptimalAutomateRun:description': 'Use auto-staking',
    'automate:action:ethereumOptimalAutomateRun:paramsDescription':
      'Autostaking for action: {{id}}',
    'automate:condition:ethereumOptimalAutomateRun:paramsDescription':
      'Restake optimal run for {{id}}',
    'automate:condition:ethereumAvgGasPrice:name': 'Gas Price Fluctuation',
    'automate:condition:ethereumAvgGasPrice:description':
      'Check gas price with expected values based on specific time and day',
    'automate:condition:ethereumAvgGasPrice:paramsDescription':
      'AVG gas price for network {{network}} in {{tolerance}}',
    'automate:condition:schedule:name': 'Schedule',
    'automate:condition:schedule:description': 'Choose a specific time frame to launch automation',
    'automate:condition:schedule:paramsDescription':
      'Days of week {{weeks}}; Months {{months}}; Days of month {{days}}; Hours {{hours}}',
    'automate:action:ethereumAutomateRun:name': 'Execute Transaction',
    'automate:action:ethereumAutomateRun:description':
      'Execute blockchain transaction automatically',
    'automate:action:notification:name': 'Send Notification',
    'automate:action:notification:description': 'Send message via email or Telegram',
    'automate:condition:contractMetric:name': 'Contract metric',
    'automate:condition:contractMetric:description': 'Contract metric condition',
    'automate:condition:contractMetric:paramsDescription': '{{metric}} {{op}} {{value}}',
  },
};
