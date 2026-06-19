export const CLASH_RESERVED_POLICY_NAMES = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS']);

export const CLASH_REMOVED_POLICY_GROUP_NAMES = new Set([
    '🎯 全球直连',
    '🛑 广告拦截',
    '🛑 全球拦截',
    '🍃 应用净化'
]);

const DEFAULT_FALLBACK_CANDIDATES = [
    '🇺🇸 美国节点',
    '♻️ 自动选择',
    '🔯 故障转移',
    '👋 手动切换',
    '☑️ 手动切换',
    '🚀 节点选择',
    '🌍 总出口'
];

function normalizePolicyName(policy) {
    return String(policy || '').trim();
}

export function isClashReservedPolicyName(policy) {
    return CLASH_RESERVED_POLICY_NAMES.has(normalizePolicyName(policy).toUpperCase());
}

export function isClashRemovedPolicyGroupName(policy) {
    return CLASH_REMOVED_POLICY_GROUP_NAMES.has(normalizePolicyName(policy));
}

export function isClashDisallowedPolicyTarget(policy) {
    return isClashReservedPolicyName(policy) || isClashRemovedPolicyGroupName(policy);
}

function collectProxyNames(proxies = []) {
    return Array.from(new Set(
        (Array.isArray(proxies) ? proxies : [])
            .map(proxy => proxy?.name || proxy?.tag)
            .filter(Boolean)
    ));
}

export function getClashPolicyFallback(proxyGroups = [], proxies = [], excludedName = '') {
    const groupNames = new Set(
        (Array.isArray(proxyGroups) ? proxyGroups : [])
            .map(group => group?.name)
            .filter(Boolean)
            .filter(name => name !== excludedName)
            .filter(name => !isClashDisallowedPolicyTarget(name))
    );
    const proxyNames = collectProxyNames(proxies).filter(name => name !== excludedName);

    for (const candidate of DEFAULT_FALLBACK_CANDIDATES) {
        if (groupNames.has(candidate)) return candidate;
    }
    if (proxyNames.length > 0) return proxyNames[0];
    return Array.from(groupNames)[0] || '';
}

function getMemberFallback(proxyGroups, proxies, group) {
    const type = String(group?.type || '').toLowerCase();
    const proxyNames = collectProxyNames(proxies).filter(name => name !== group?.name);

    if (['url-test', 'fallback', 'load-balance'].includes(type) && proxyNames.length > 0) {
        return proxyNames[0];
    }

    return getClashPolicyFallback(proxyGroups, proxies, group?.name);
}

export function sanitizeClashProxyGroups(proxyGroups = [], proxies = []) {
    const filteredGroups = (Array.isArray(proxyGroups) ? proxyGroups : [])
        .filter(group => group?.name && !isClashRemovedPolicyGroupName(group.name));

    return filteredGroups.map(group => {
        const rawMembers = Array.isArray(group.proxies) ? group.proxies.filter(Boolean) : [];
        let nextMembers = rawMembers.filter(member => {
            const memberName = normalizePolicyName(member);
            return memberName && memberName !== group.name && !isClashDisallowedPolicyTarget(memberName);
        });

        const hasFilter = Boolean(group.filter);
        if (nextMembers.length === 0 && !hasFilter) {
            const fallback = getMemberFallback(filteredGroups, proxies, group);
            if (fallback) nextMembers = [fallback];
        }

        return {
            ...group,
            proxies: nextMembers
        };
    });
}

export function sanitizeClashPolicy(policy, fallbackPolicy) {
    const policyName = normalizePolicyName(policy);
    if (!policyName) return fallbackPolicy;
    if (isClashDisallowedPolicyTarget(policyName)) return fallbackPolicy;
    return policyName;
}

export function sanitizeClashRuleLine(ruleLine, fallbackPolicy) {
    const parts = String(ruleLine || '').split(',').map(part => part.trim());
    if (parts.length < 2 || !fallbackPolicy) return ruleLine;

    const type = String(parts[0] || '').toUpperCase();
    const policyIndex = (type === 'MATCH' || type === 'FINAL') ? 1 : 2;
    if (parts.length <= policyIndex) return ruleLine;

    parts[policyIndex] = sanitizeClashPolicy(parts[policyIndex], fallbackPolicy);
    return parts.join(',');
}
