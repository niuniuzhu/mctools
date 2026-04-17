const COMMANDS = {
  tp: ({ target, destination }) => {
    const safeTarget = target.trim() || '@p';
    const safeDestination = destination.trim() || '@s';
    return `tp ${safeTarget} ${safeDestination}`;
  },
  give: ({ target, item, count }) => {
    const safeTarget = target.trim() || '@p';
    const safeItem = item.trim() || 'minecraft:stone';
    const safeCount = Math.max(1, Number.parseInt(count, 10) || 1);
    return `give ${safeTarget} ${safeItem} ${safeCount}`;
  },
  summon: ({ entity, pos, extra }) => {
    const safeEntity = entity.trim() || 'minecraft:zombie';
    const safePos = pos.trim() || '~ ~ ~';
    const safeExtra = extra.trim();
    return safeExtra
      ? `summon ${safeEntity} ${safePos} ${safeExtra}`
      : `summon ${safeEntity} ${safePos}`;
  },
  effect: ({ target, effect, duration, amplifier, hideParticles }) => {
    const safeTarget = target.trim() || '@p';
    const safeEffect = effect.trim() || 'minecraft:speed';
    const safeDuration = Math.max(1, Number.parseInt(duration, 10) || 30);
    const safeAmplifier = Math.max(0, Number.parseInt(amplifier, 10) || 0);
    return `effect give ${safeTarget} ${safeEffect} ${safeDuration} ${safeAmplifier} ${hideParticles ? 'true' : 'false'}`;
  },
  time: ({ preset, customValue }) => {
    const presets = {
      day: '1000',
      noon: '6000',
      night: '13000',
      midnight: '18000'
    };
    const value = preset === 'custom'
      ? Math.max(0, Number.parseInt(customValue, 10) || 0)
      : presets[preset] || '1000';
    return `time set ${value}`;
  },
  gamemode: ({ mode, target }) => {
    const safeMode = mode || 'creative';
    const safeTarget = target.trim() || '@p';
    return `gamemode ${safeMode} ${safeTarget}`;
  },
  weather: ({ weatherType, duration }) => {
    const safeWeatherType = weatherType || 'clear';
    const safeDuration = Math.max(1, Number.parseInt(duration, 10) || 1000);
    return `weather ${safeWeatherType} ${safeDuration}`;
  },
  xp: ({ amount, target, levelMode }) => {
    const safeAmount = Math.max(1, Number.parseInt(amount, 10) || 1);
    const safeTarget = target.trim() || '@p';
    return levelMode ? `xp add ${safeTarget} ${safeAmount} levels` : `xp add ${safeTarget} ${safeAmount} points`;
  },
  setblock: ({ pos, block, mode }) => {
    const safePos = pos.trim() || '~ ~ ~';
    const safeBlock = block.trim() || 'minecraft:stone';
    const safeMode = mode || 'replace';
    return `setblock ${safePos} ${safeBlock} ${safeMode}`;
  },
  fill: ({ fromPos, toPos, block, mode }) => {
    const safeFromPos = fromPos.trim() || '~ ~ ~';
    const safeToPos = toPos.trim() || '~1 ~1 ~1';
    const safeBlock = block.trim() || 'minecraft:stone';
    const safeMode = mode || 'replace';
    return `fill ${safeFromPos} ${safeToPos} ${safeBlock} ${safeMode}`;
  },
  clear: ({ target, item, maxCount }) => {
    const safeTarget = target.trim() || '@p';
    const safeItem = item.trim();
    const safeMaxCount = Math.max(1, Number.parseInt(maxCount, 10) || 1);

    if (!safeItem) {
      return `clear ${safeTarget}`;
    }

    return `clear ${safeTarget} ${safeItem} ${safeMaxCount}`;
  },
  difficulty: ({ level }) => {
    const safeLevel = level || 'normal';
    return `difficulty ${safeLevel}`;
  },
  locate: ({ category, target }) => {
    const safeCategory = category || 'structure';
    const safeTarget = target.trim() || 'minecraft:village';
    return `locate ${safeCategory} ${safeTarget}`;
  },
  title: ({ targets, action, text }) => {
    const safeTargets = targets.trim() || '@a';
    const safeAction = action || 'title';
    const safeText = text.trim() || '{"text":"欢迎来到服务器"}';
    return `title ${safeTargets} ${safeAction} ${safeText}`;
  },
  playsound: ({ sound, source, targets, pos, volume, pitch, minVolume }) => {
    const safeSound = sound.trim() || 'minecraft:entity.experience_orb.pickup';
    const safeSource = source || 'master';
    const safeTargets = targets.trim() || '@a';
    const safePos = pos.trim() || '~ ~ ~';
    const safeVolume = Math.max(0, Number.parseFloat(volume) || 1);
    const safePitch = Math.max(0, Number.parseFloat(pitch) || 1);
    const safeMinVolume = Math.max(0, Number.parseFloat(minVolume) || 0);
    return `playsound ${safeSound} ${safeSource} ${safeTargets} ${safePos} ${safeVolume} ${safePitch} ${safeMinVolume}`;
  },
  particle: ({ particleName, pos, delta, speed, count, mode, viewers }) => {
    const safeParticleName = particleName.trim() || 'minecraft:flame';
    const safePos = pos.trim() || '~ ~1 ~';
    const safeDelta = delta.trim() || '0.5 0.5 0.5';
    const safeSpeed = Math.max(0, Number.parseFloat(speed) || 0);
    const safeCount = Math.max(1, Number.parseInt(count, 10) || 10);
    const safeMode = mode || 'normal';
    const safeViewers = viewers.trim() || '@a';
    return `particle ${safeParticleName} ${safePos} ${safeDelta} ${safeSpeed} ${safeCount} ${safeMode} ${safeViewers}`;
  },
  enchant: ({ target, enchantment, level }) => {
    const safeTarget = target.trim() || '@p';
    const safeEnchantment = enchantment.trim() || 'sharpness';
    const safeLevel = Math.max(1, Number.parseInt(level, 10) || 1);
    return `enchant ${safeTarget} ${safeEnchantment} ${safeLevel}`;
  },
  gamerule: ({ rule, value }) => {
    const safeRule = rule.trim() || 'keepInventory';
    const safeValue = value.trim() || 'true';
    return `gamerule ${safeRule} ${safeValue}`;
  },
  clone: ({ begin, end, destination, maskMode, cloneMode }) => {
    const safeBegin = begin.trim() || '~ ~ ~';
    const safeEnd = end.trim() || '~5 ~5 ~5';
    const safeDestination = destination.trim() || '~10 ~ ~10';
    const safeMaskMode = maskMode || 'replace';
    const safeCloneMode = cloneMode || 'normal';
    return `clone ${safeBegin} ${safeEnd} ${safeDestination} ${safeMaskMode} ${safeCloneMode}`;
  },
  spreadplayers: ({ centerX, centerZ, spreadDistance, maxRange, respectTeams, targets, maxHeight }) => {
    const safeCenterX = Number.parseFloat(centerX) || 0;
    const safeCenterZ = Number.parseFloat(centerZ) || 0;
    const safeSpreadDistance = Math.max(1, Number.parseFloat(spreadDistance) || 8);
    const safeMaxRange = Math.max(safeSpreadDistance, Number.parseFloat(maxRange) || 24);
    const safeRespectTeams = respectTeams ? 'true' : 'false';
    const safeTargets = targets.trim() || '@a';
    const safeMaxHeight = Math.max(1, Number.parseInt(maxHeight, 10) || 256);
    return `spreadplayers ${safeCenterX} ${safeCenterZ} ${safeSpreadDistance} ${safeMaxRange} under ${safeMaxHeight} ${safeRespectTeams} ${safeTargets}`;
  },
  executeChain: ({ executor, anchorPos, conditionType, conditionValue, runCommand }) => {
    const safeExecutor = executor.trim() || '@p';
    const safeAnchorPos = anchorPos.trim() || '~ ~ ~';
    const safeConditionType = conditionType || 'ifEntity';
    const safeRunCommand = runCommand.trim() || 'say 条件执行成功';
    let executeCommand = `execute as ${safeExecutor} positioned ${safeAnchorPos}`;

    if (safeConditionType === 'ifBlock') {
      executeCommand += ` if block ${conditionValue.trim() || '~ ~-1 ~ minecraft:diamond_block'}`;
    } else if (safeConditionType === 'unlessBlock') {
      executeCommand += ` unless block ${conditionValue.trim() || '~ ~-1 ~ minecraft:air'}`;
    } else if (safeConditionType === 'unlessEntity') {
      executeCommand += ` unless entity ${conditionValue.trim() || '@e[type=minecraft:zombie,distance=..8]'}`;
    } else {
      executeCommand += ` if entity ${conditionValue.trim() || '@a[tag=arena]'}`;
    }

    return `${executeCommand} run ${safeRunCommand}`;
  },
  scoreboardObjective: ({ objectiveName, criterion, displayName }) => {
    const safeObjectiveName = objectiveName.trim() || 'bossDamage';
    const safeCriterion = criterion.trim() || 'dummy';
    const safeDisplayName = displayName.trim() || 'Boss Damage';
    return `scoreboard objectives add ${safeObjectiveName} ${safeCriterion} ${JSON.stringify(safeDisplayName)}`;
  },
  scoreboardOperation: ({ target, targetObjective, operation, source, sourceObjective }) => {
    const safeTarget = target.trim() || '@p';
    const safeTargetObjective = targetObjective.trim() || 'coins';
    const safeOperation = operation || '+=';
    const safeSource = source.trim() || '@s';
    const safeSourceObjective = sourceObjective.trim() || 'bonus';
    return `scoreboard players operation ${safeTarget} ${safeTargetObjective} ${safeOperation} ${safeSource} ${safeSourceObjective}`;
  },
  itemReplace: ({ target, slot, item, count }) => {
    const safeTarget = target.trim() || '@p';
    const safeSlot = slot.trim() || 'weapon.mainhand';
    const safeItem = item.trim() || 'minecraft:netherite_sword';
    const safeCount = Math.max(1, Number.parseInt(count, 10) || 1);
    return `item replace entity ${safeTarget} ${safeSlot} with ${safeItem} ${safeCount}`;
  },
  lootTable: ({ target, sourceType, sourceValue, toolItem }) => {
    const safeTarget = target.trim() || '@p';
    const safeSourceType = sourceType || 'loot';
    const safeSourceValue = sourceValue.trim() || 'minecraft:chests/end_city_treasure';
    const safeToolItem = toolItem.trim() || 'minecraft:diamond_pickaxe';

    if (safeSourceType === 'kill') {
      return `loot give ${safeTarget} kill ${safeSourceValue}`;
    }

    if (safeSourceType === 'mine') {
      return `loot give ${safeTarget} mine ${safeSourceValue} ${safeToolItem}`;
    }

    return `loot give ${safeTarget} loot ${safeSourceValue}`;
  },
  dataMergeBlock: ({ pos, nbt }) => {
    const safePos = pos.trim() || '~ ~ ~';
    const safeNbt = nbt.trim() || '{Lock:"VIP",CustomName:"\"奖励箱\""}';
    return `data merge block ${safePos} ${safeNbt}`;
  },
  dataMergeEntity: ({ target, nbt }) => {
    const safeTarget = target.trim() || '@e[type=minecraft:villager,limit=1,sort=nearest]';
    const safeNbt = nbt.trim() || '{NoAI:1b,Invulnerable:1b,CustomName:"\"商人守卫\""}';
    return `data merge entity ${safeTarget} ${safeNbt}`;
  },
  attributeBase: ({ target, attributeName, value }) => {
    const safeTarget = target.trim() || '@p';
    const safeAttributeName = attributeName.trim() || 'minecraft:generic.max_health';
    const safeValue = Number.parseFloat(value) || 40;
    return `attribute ${safeTarget} ${safeAttributeName} base set ${safeValue}`;
  },
  scheduleFunction: ({ functionId, timeValue, timeUnit, scheduleMode }) => {
    const safeFunctionId = functionId.trim() || 'mctools:arena/round_start';
    const safeTimeValue = Math.max(1, Number.parseInt(timeValue, 10) || 20);
    const safeTimeUnit = timeUnit || 's';
    const safeScheduleMode = scheduleMode || 'replace';
    return `schedule function ${safeFunctionId} ${safeTimeValue}${safeTimeUnit} ${safeScheduleMode}`;
  },
  fillBiome: ({ fromPos, toPos, biome, replaceBiome }) => {
    const safeFromPos = fromPos.trim() || '~ ~ ~';
    const safeToPos = toPos.trim() || '~16 ~16 ~16';
    const safeBiome = biome.trim() || 'minecraft:cherry_grove';
    const safeReplaceBiome = replaceBiome.trim();
    return safeReplaceBiome
      ? `fillbiome ${safeFromPos} ${safeToPos} ${safeBiome} replace ${safeReplaceBiome}`
      : `fillbiome ${safeFromPos} ${safeToPos} ${safeBiome}`;
  },
  snowballMenuOpen: ({ projectileTag, menuTag, objectiveName, radius, openScore, titleText, soundId }) => {
    const safeProjectileTag = projectileTag.trim() || 'menu_ball';
    const safeMenuTag = menuTag.trim() || 'snowball_menu';
    const safeObjectiveName = objectiveName.trim() || 'menuSelect';
    const safeRadius = Math.max(1, Number.parseFloat(radius) || 5);
    const safeOpenScore = Math.max(1, Number.parseInt(openScore, 10) || 1);
    const safeTitleText = titleText.trim() || '雪球菜单已开启';
    const safeSoundId = soundId.trim() || 'minecraft:block.note_block.pling';
    return [
      `execute as @e[type=minecraft:snowball,tag=!${safeProjectileTag}] at @s run tag @s add ${safeProjectileTag}`,
      `execute as @e[type=minecraft:snowball,tag=${safeProjectileTag}] at @s run tag @a[distance=..${safeRadius}] add ${safeMenuTag}`,
      `execute as @e[type=minecraft:snowball,tag=${safeProjectileTag}] at @s run scoreboard players set @a[distance=..${safeRadius}] ${safeObjectiveName} ${safeOpenScore}`,
      `execute as @e[type=minecraft:snowball,tag=${safeProjectileTag}] at @s run title @a[distance=..${safeRadius}] actionbar ${JSON.stringify(safeTitleText)}`,
      `execute as @e[type=minecraft:snowball,tag=${safeProjectileTag}] at @s run playsound ${safeSoundId} master @a[distance=..${safeRadius}] ~ ~ ~ 1 1 0`,
      `kill @e[type=minecraft:snowball,tag=${safeProjectileTag}]`
    ].join('\n');
  },
  snowballMenuHud: ({ menuTag, objectiveName, optionOneLabel, optionTwoLabel, optionThreeLabel }) => {
    const safeMenuTag = menuTag.trim() || 'snowball_menu';
    const safeObjectiveName = objectiveName.trim() || 'menuSelect';
    const labelOne = optionOneLabel.trim() || '回城';
    const labelTwo = optionTwoLabel.trim() || '补给';
    const labelThree = optionThreeLabel.trim() || '治疗';
    return [
      `execute as @a[tag=${safeMenuTag},scores={${safeObjectiveName}=1}] run title @s actionbar ${JSON.stringify(`=> ${labelOne} | ${labelTwo} | ${labelThree}`)}`,
      `execute as @a[tag=${safeMenuTag},scores={${safeObjectiveName}=2}] run title @s actionbar ${JSON.stringify(`${labelOne} | => ${labelTwo} | ${labelThree}`)}`,
      `execute as @a[tag=${safeMenuTag},scores={${safeObjectiveName}=3}] run title @s actionbar ${JSON.stringify(`${labelOne} | ${labelTwo} | => ${labelThree}`)}`
    ].join('\n');
  },
  snowballMenuRun: ({ menuTag, objectiveName, selectedScore, runCommand, cooldownObjective, cooldownTicks, clearAfterRun }) => {
    const safeMenuTag = menuTag.trim() || 'snowball_menu';
    const safeObjectiveName = objectiveName.trim() || 'menuSelect';
    const safeSelectedScore = Math.max(1, Number.parseInt(selectedScore, 10) || 1);
    const safeRunCommand = runCommand.trim() || 'tp @s 0 80 0';
    const safeCooldownObjective = cooldownObjective.trim() || 'menuCooldown';
    const safeCooldownTicks = Math.max(0, Number.parseInt(cooldownTicks, 10) || 40);
    const selector = `@a[tag=${safeMenuTag},scores={${safeObjectiveName}=${safeSelectedScore}}]`;
    const commands = [
      `execute as ${selector} run ${safeRunCommand}`,
      `scoreboard players set ${selector} ${safeCooldownObjective} ${safeCooldownTicks}`,
      `scoreboard players set ${selector} ${safeObjectiveName} 0`
    ];

    if (clearAfterRun) {
      commands.push(`tag ${selector} remove ${safeMenuTag}`);
    }

    return commands.join('\n');
  },
  banMenuOpen: ({ menuTag, objectiveName, pageObjective, moderatorSelector, targetName, openScore, titleText, soundId }) => {
    const safeMenuTag = menuTag.trim() || 'ban_menu';
    const safeObjectiveName = objectiveName.trim() || 'banSelect';
    const safePageObjective = pageObjective.trim() || 'banPage';
    const safeModeratorSelector = moderatorSelector.trim() || '@p[tag=staff]';
    const safeTargetName = targetName.trim() || 'TargetPlayer';
    const safeOpenScore = Math.max(1, Number.parseInt(openScore, 10) || 1);
    const safeTitleText = titleText.trim() || `封禁菜单已开启：目标 ${safeTargetName}`;
    const safeSoundId = soundId.trim() || 'minecraft:block.note_block.pling';
    return [
      `tag ${safeModeratorSelector} add ${safeMenuTag}`,
      `scoreboard players set ${safeModeratorSelector} ${safeObjectiveName} ${safeOpenScore}`,
      `scoreboard players set ${safeModeratorSelector} ${safePageObjective} 1`,
      `title ${safeModeratorSelector} actionbar ${JSON.stringify(safeTitleText)}`,
      `playsound ${safeSoundId} master ${safeModeratorSelector} ~ ~ ~ 1 1 0`
    ].join('\n');
  },
  banMenuSelect: ({ menuTag, objectiveName, triggerObjective, triggerScore, mode, optionCount, selectedValue, soundId }) => {
    const safeMenuTag = menuTag.trim() || 'ban_menu';
    const safeObjectiveName = objectiveName.trim() || 'banSelect';
    const safeTriggerObjective = triggerObjective.trim() || 'banClick';
    const safeTriggerScore = Math.max(1, Number.parseInt(triggerScore, 10) || 1);
    const safeMode = mode || 'next';
    const safeOptionCount = Math.max(2, Number.parseInt(optionCount, 10) || 4);
    const safeSelectedValue = Math.min(safeOptionCount, Math.max(1, Number.parseInt(selectedValue, 10) || 1));
    const safeSoundId = soundId.trim() || 'minecraft:ui.button.click';
    const selector = `@a[tag=${safeMenuTag},scores={${safeTriggerObjective}=${safeTriggerScore}..}]`;
    const commands = [];

    if (safeMode === 'prev') {
      commands.push(`scoreboard players remove ${selector} ${safeObjectiveName} 1`);
      commands.push(`execute as @a[tag=${safeMenuTag},scores={${safeObjectiveName}=..0}] run scoreboard players set @s ${safeObjectiveName} ${safeOptionCount}`);
    } else if (safeMode === 'direct') {
      commands.push(`scoreboard players set ${selector} ${safeObjectiveName} ${safeSelectedValue}`);
    } else {
      commands.push(`scoreboard players add ${selector} ${safeObjectiveName} 1`);
      commands.push(`execute as @a[tag=${safeMenuTag},scores={${safeObjectiveName}=${safeOptionCount + 1}..}] run scoreboard players set @s ${safeObjectiveName} 1`);
    }

    commands.push(`scoreboard players set ${selector} ${safeTriggerObjective} 0`);
    commands.push(`execute as ${selector} run playsound ${safeSoundId} master @s ~ ~ ~ 0.7 1.2 0`);
    return commands.join('\n');
  },
  banMenuHud: ({ menuTag, objectiveName, pageObjective, pageValue, optionOneLabel, optionTwoLabel, optionThreeLabel, optionFourLabel }) => {
    const safeMenuTag = menuTag.trim() || 'ban_menu';
    const safeObjectiveName = objectiveName.trim() || 'banSelect';
    const safePageObjective = pageObjective.trim() || 'banPage';
    const safePageValue = Math.max(1, Number.parseInt(pageValue, 10) || 1);
    const labelOne = optionOneLabel.trim() || '24h封禁';
    const labelTwo = optionTwoLabel.trim() || '永久封禁';
    const labelThree = optionThreeLabel.trim() || '踢出玩家';
    const labelFour = optionFourLabel.trim() || '解封玩家';
    const selectorBase = `@a[tag=${safeMenuTag},scores={${safePageObjective}=${safePageValue}}]`;
    return [
      `execute as ${selectorBase}[scores={${safeObjectiveName}=1}] run title @s actionbar ${JSON.stringify(`=> ${labelOne} | ${labelTwo} | ${labelThree} | ${labelFour}`)}`,
      `execute as ${selectorBase}[scores={${safeObjectiveName}=2}] run title @s actionbar ${JSON.stringify(`${labelOne} | => ${labelTwo} | ${labelThree} | ${labelFour}`)}`,
      `execute as ${selectorBase}[scores={${safeObjectiveName}=3}] run title @s actionbar ${JSON.stringify(`${labelOne} | ${labelTwo} | => ${labelThree} | ${labelFour}`)}`,
      `execute as ${selectorBase}[scores={${safeObjectiveName}=4}] run title @s actionbar ${JSON.stringify(`${labelOne} | ${labelTwo} | ${labelThree} | => ${labelFour}`)}`
    ].join('\n');
  },
  banMenuPage: ({ menuTag, pageObjective, triggerObjective, triggerScore, direction, maxPage, directPage, soundId }) => {
    const safeMenuTag = menuTag.trim() || 'ban_menu';
    const safePageObjective = pageObjective.trim() || 'banPage';
    const safeTriggerObjective = triggerObjective.trim() || 'banPageClick';
    const safeTriggerScore = Math.max(1, Number.parseInt(triggerScore, 10) || 1);
    const safeDirection = direction || 'next';
    const safeMaxPage = Math.max(2, Number.parseInt(maxPage, 10) || 2);
    const safeDirectPage = Math.min(safeMaxPage, Math.max(1, Number.parseInt(directPage, 10) || 1));
    const safeSoundId = soundId.trim() || 'minecraft:item.book.page_turn';
    const selector = `@a[tag=${safeMenuTag},scores={${safeTriggerObjective}=${safeTriggerScore}..}]`;
    const commands = [];

    if (safeDirection === 'prev') {
      commands.push(`scoreboard players remove ${selector} ${safePageObjective} 1`);
      commands.push(`execute as @a[tag=${safeMenuTag},scores={${safePageObjective}=..0}] run scoreboard players set @s ${safePageObjective} ${safeMaxPage}`);
    } else if (safeDirection === 'direct') {
      commands.push(`scoreboard players set ${selector} ${safePageObjective} ${safeDirectPage}`);
    } else {
      commands.push(`scoreboard players add ${selector} ${safePageObjective} 1`);
      commands.push(`execute as @a[tag=${safeMenuTag},scores={${safePageObjective}=${safeMaxPage + 1}..}] run scoreboard players set @s ${safePageObjective} 1`);
    }

    commands.push(`scoreboard players set ${selector} ${safeTriggerObjective} 0`);
    commands.push(`execute as ${selector} run playsound ${safeSoundId} master @s ~ ~ ~ 0.8 1 0`);
    return commands.join('\n');
  },
  banMenuBan: ({ menuTag, objectiveName, selectedScore, targetName, banMode, durationText, reason, clearAfterRun }) => {
    const safeMenuTag = menuTag.trim() || 'ban_menu';
    const safeObjectiveName = objectiveName.trim() || 'banSelect';
    const safeSelectedScore = Math.max(1, Number.parseInt(selectedScore, 10) || 1);
    const safeTargetName = targetName.trim() || 'TargetPlayer';
    const safeBanMode = banMode || 'tempban';
    const safeDurationText = durationText.trim() || '24h';
    const safeReason = reason.trim() || '违反服务器规则';
    const selector = `@a[tag=${safeMenuTag},scores={${safeObjectiveName}=${safeSelectedScore}}]`;
    const commandText = safeBanMode === 'permaban'
      ? `ban ${safeTargetName} ${safeReason}`
      : `tempban ${safeTargetName} ${safeDurationText} ${safeReason}`;
    const commands = [
      `execute as ${selector} run ${commandText}`,
      `title ${selector} actionbar ${JSON.stringify(`已对 ${safeTargetName} 执行${safeBanMode === 'permaban' ? '永久封禁' : `临时封禁 ${safeDurationText}`}`)}`,
      `scoreboard players set ${selector} ${safeObjectiveName} 0`
    ];

    if (clearAfterRun) {
      commands.push(`tag ${selector} remove ${safeMenuTag}`);
    }

    return commands.join('\n');
  },
  banMenuKick: ({ menuTag, objectiveName, selectedScore, targetName, reason, clearAfterRun }) => {
    const safeMenuTag = menuTag.trim() || 'ban_menu';
    const safeObjectiveName = objectiveName.trim() || 'banSelect';
    const safeSelectedScore = Math.max(1, Number.parseInt(selectedScore, 10) || 1);
    const safeTargetName = targetName.trim() || 'TargetPlayer';
    const safeReason = reason.trim() || '管理员手动移出';
    const selector = `@a[tag=${safeMenuTag},scores={${safeObjectiveName}=${safeSelectedScore}}]`;
    const commands = [
      `execute as ${selector} run kick ${safeTargetName} ${safeReason}`,
      `title ${selector} actionbar ${JSON.stringify(`已踢出 ${safeTargetName}`)}`,
      `scoreboard players set ${selector} ${safeObjectiveName} 0`
    ];

    if (clearAfterRun) {
      commands.push(`tag ${selector} remove ${safeMenuTag}`);
    }

    return commands.join('\n');
  },
  banMenuUnban: ({ menuTag, objectiveName, selectedScore, targetName, clearAfterRun }) => {
    const safeMenuTag = menuTag.trim() || 'ban_menu';
    const safeObjectiveName = objectiveName.trim() || 'banSelect';
    const safeSelectedScore = Math.max(1, Number.parseInt(selectedScore, 10) || 1);
    const safeTargetName = targetName.trim() || 'TargetPlayer';
    const selector = `@a[tag=${safeMenuTag},scores={${safeObjectiveName}=${safeSelectedScore}}]`;
    const commands = [
      `execute as ${selector} run pardon ${safeTargetName}`,
      `title ${selector} actionbar ${JSON.stringify(`已解封 ${safeTargetName}`)}`,
      `scoreboard players set ${selector} ${safeObjectiveName} 0`
    ];

    if (clearAfterRun) {
      commands.push(`tag ${selector} remove ${safeMenuTag}`);
    }

    return commands.join('\n');
  },
  banRecordQuery: ({ pluginType, queryMode, targetName, page, pageSize, includeIp }) => {
    const safePluginType = pluginType || 'vanilla';
    const safeQueryMode = queryMode || 'banlist';
    const safeTargetName = targetName.trim() || 'TargetPlayer';
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safePageSize = Math.max(1, Number.parseInt(pageSize, 10) || 10);

    if (safePluginType === 'litebans') {
      if (safeQueryMode === 'history') {
        return `litebans history ${safeTargetName} ${safePage}`;
      }

      if (safeQueryMode === 'check') {
        return `litebans checkban ${safeTargetName}`;
      }

      return `litebans bans ${safeTargetName}`;
    }

    if (safePluginType === 'advancedban') {
      if (safeQueryMode === 'history') {
        return `advancedban history ${safeTargetName} ${safePage}`;
      }

      if (safeQueryMode === 'check') {
        return `advancedban check ${safeTargetName}`;
      }

      return `advancedban list ${safeTargetName} ${safePage} ${safePageSize}`;
    }

    if (safeQueryMode === 'iplist') {
      return includeIp ? 'banlist ips' : 'banlist';
    }

    if (safeQueryMode === 'check') {
      return `banlist | findstr ${safeTargetName}`;
    }

    return 'banlist';
  }
};

try {
  const storedUi = localStorage.getItem('mctools-ui') || 'normal';
  const nextUi = storedUi === 'normal' || storedUi === 'classic' || storedUi === 'end' ? storedUi : 'normal';
  localStorage.setItem('mctools-ui', nextUi);
  document.documentElement.dataset.ui = nextUi;
} catch {
  document.documentElement.dataset.ui = 'normal';
}

const VIP_COMPLEX_COMMANDS = new Set([
  'executeChain',
  'scoreboardObjective',
  'scoreboardOperation',
  'itemReplace',
  'lootTable',
  'dataMergeBlock',
  'dataMergeEntity',
  'attributeBase',
  'scheduleFunction',
  'fillBiome',
  'snowballMenuOpen',
  'snowballMenuHud',
  'snowballMenuRun',
  'banMenuOpen',
  'banMenuSelect',
  'banMenuHud',
  'banMenuPage',
  'banMenuBan',
  'banMenuKick',
  'banMenuUnban',
  'banRecordQuery'
]);

let currentMe = null;
let currentHistoryItems = [];

const COMMAND_PRESETS = {
  tp: [
    {
      id: 'spawn',
      name: '回到主城',
      description: '把玩家传送到主城广场。',
      values: { target: '@p', destination: '0 80 0' }
    },
    {
      id: 'team',
      name: '传送到队友',
      description: '快速传送到最近的队友或队长。',
      values: { target: '@p', destination: '@a[team=red,limit=1]' }
    }
  ],
  give: [
    {
      id: 'starter',
      name: '开荒礼包',
      description: '发放前期常用的钻石工具。',
      values: { target: '@p', item: 'minecraft:diamond_pickaxe', count: '1' }
    },
    {
      id: 'blocks',
      name: '建筑材料包',
      description: '发放一组常用建筑方块。',
      values: { target: '@p', item: 'minecraft:stone_bricks', count: '64' }
    }
  ],
  summon: [
    {
      id: 'boss',
      name: 'Boss 演示',
      description: '召唤带名称的强化僵尸。',
      values: {
        entity: 'minecraft:zombie',
        pos: '~ ~ ~',
        extra: '{CustomName:"\\"Boss Zombie\\"",Health:80f,PersistenceRequired:1b}'
      }
    },
    {
      id: 'merchant',
      name: '村民商人',
      description: '召唤一个不会移动的展示商人。',
      values: {
        entity: 'minecraft:villager',
        pos: '~ ~ ~',
        extra: '{NoAI:1b,Invulnerable:1b,CustomName:"\\"工具商人\\""}'
      }
    }
  ],
  effect: [
    {
      id: 'speedrun',
      name: '跑图加速',
      description: '给玩家短时间高速移动。',
      values: { target: '@p', effect: 'minecraft:speed', duration: '90', amplifier: '2', hideParticles: true }
    }
  ],
  fill: [
    {
      id: 'wall',
      name: '快速建墙',
      description: '生成一面石砖墙。',
      values: { fromPos: '~ ~ ~', toPos: '~20 ~5 ~', block: 'minecraft:stone_bricks', mode: 'replace' }
    },
    {
      id: 'clear-space',
      name: '清场挖空',
      description: '把指定区域全部变成空气。',
      values: { fromPos: '~ ~ ~', toPos: '~10 ~6 ~10', block: 'minecraft:air', mode: 'replace' }
    }
  ],
  title: [
    {
      id: 'welcome',
      name: '欢迎标题',
      description: '进入服务器时显示欢迎信息。',
      values: { targets: '@a', action: 'title', text: '{"text":"欢迎来到我的世界工具箱服务器","color":"gold"}' }
    }
  ],
  gamerule: [
    {
      id: 'keep-inventory',
      name: '保留背包',
      description: '死亡后不掉落物品。',
      values: { rule: 'keepInventory', value: 'true' }
    }
  ],
  executeChain: [
    {
      id: 'diamond-check',
      name: '脚下钻石块检测',
      description: '检测玩家脚下是钻石块时执行命令。',
      values: {
        executor: '@p',
        anchorPos: '~ ~ ~',
        conditionType: 'ifBlock',
        conditionValue: '~ ~-1 ~ minecraft:diamond_block',
        runCommand: 'say 你站在钻石块上'
      }
    }
  ],
  scoreboardObjective: [
    {
      id: 'coins',
      name: '金币计分板',
      description: '创建一个金币计分板目标。',
      values: { objectiveName: 'coins', criterion: 'dummy', displayName: 'Coins' }
    }
  ],
  snowballMenuOpen: [
    {
      id: 'snowball-shop-open',
      name: '雪球商店打开',
      description: '玩家扔雪球后，给附近玩家打开 3 选 1 菜单。',
      values: {
        projectileTag: 'menu_ball',
        menuTag: 'snowball_menu',
        objectiveName: 'menuSelect',
        radius: '5',
        openScore: '1',
        titleText: '雪球菜单已开启：请切换选项',
        soundId: 'minecraft:block.note_block.pling'
      }
    }
  ],
  snowballMenuHud: [
    {
      id: 'snowball-shop-hud',
      name: '雪球菜单显示',
      description: '显示回城、补给、治疗三个选项。',
      values: {
        menuTag: 'snowball_menu',
        objectiveName: 'menuSelect',
        optionOneLabel: '回城',
        optionTwoLabel: '补给',
        optionThreeLabel: '治疗'
      }
    }
  ],
  snowballMenuRun: [
    {
      id: 'snowball-shop-run',
      name: '雪球菜单执行',
      description: '菜单选中第 1 项时把玩家传送回主城。',
      values: {
        menuTag: 'snowball_menu',
        objectiveName: 'menuSelect',
        selectedScore: '1',
        runCommand: 'tp @s 0 80 0',
        cooldownObjective: 'menuCooldown',
        cooldownTicks: '40',
        clearAfterRun: true
      }
    }
  ],
  banMenuOpen: [
    {
      id: 'ban-menu-open',
      name: '封禁菜单开启',
      description: '给管理员打开一个封禁菜单。',
      values: {
        menuTag: 'ban_menu',
        objectiveName: 'banSelect',
        pageObjective: 'banPage',
        moderatorSelector: '@p[tag=staff]',
        targetName: 'TargetPlayer',
        openScore: '1',
        titleText: '封禁菜单已开启：目标 TargetPlayer',
        soundId: 'minecraft:block.note_block.pling'
      }
    }
  ],
  banMenuSelect: [
    {
      id: 'ban-menu-select',
      name: '封禁菜单下一项',
      description: '把封禁菜单切到下一个选项。',
      values: {
        menuTag: 'ban_menu',
        objectiveName: 'banSelect',
        triggerObjective: 'banClick',
        triggerScore: '1',
        mode: 'next',
        optionCount: '4',
        selectedValue: '1',
        soundId: 'minecraft:ui.button.click'
      }
    }
  ],
  banMenuHud: [
    {
      id: 'ban-menu-hud',
      name: '封禁菜单显示',
      description: '显示封禁、永久封禁、踢出、解封四项。',
      values: {
        menuTag: 'ban_menu',
        objectiveName: 'banSelect',
        pageObjective: 'banPage',
        pageValue: '1',
        optionOneLabel: '24h封禁',
        optionTwoLabel: '永久封禁',
        optionThreeLabel: '踢出玩家',
        optionFourLabel: '解封玩家'
      }
    }
  ],
  banMenuPage: [
    {
      id: 'ban-menu-page',
      name: '封禁菜单翻页',
      description: '在封禁菜单的多个页面间切换。',
      values: {
        menuTag: 'ban_menu',
        pageObjective: 'banPage',
        triggerObjective: 'banPageClick',
        triggerScore: '1',
        direction: 'next',
        maxPage: '2',
        directPage: '1',
        soundId: 'minecraft:item.book.page_turn'
      }
    }
  ],
  banMenuBan: [
    {
      id: 'ban-menu-ban',
      name: '封禁菜单执行封禁',
      description: '对目标执行 24 小时临时封禁。',
      values: {
        menuTag: 'ban_menu',
        objectiveName: 'banSelect',
        selectedScore: '1',
        targetName: 'TargetPlayer',
        banMode: 'tempban',
        durationText: '24h',
        reason: '违反服务器规则',
        clearAfterRun: true
      }
    }
  ],
  banMenuKick: [
    {
      id: 'ban-menu-kick',
      name: '封禁菜单执行踢出',
      description: '执行菜单中的踢出操作。',
      values: {
        menuTag: 'ban_menu',
        objectiveName: 'banSelect',
        selectedScore: '3',
        targetName: 'TargetPlayer',
        reason: '请先联系管理员',
        clearAfterRun: true
      }
    }
  ],
  banMenuUnban: [
    {
      id: 'ban-menu-unban',
      name: '封禁菜单执行解封',
      description: '执行菜单中的解封操作。',
      values: {
        menuTag: 'ban_menu',
        objectiveName: 'banSelect',
        selectedScore: '4',
        targetName: 'TargetPlayer',
        clearAfterRun: true
      }
    }
  ],
  banRecordQuery: [
    {
      id: 'ban-record-litebans',
      name: '查询玩家封禁记录',
      description: '查询指定玩家的封禁历史记录。',
      values: {
        pluginType: 'litebans',
        queryMode: 'history',
        targetName: 'TargetPlayer',
        page: '1',
        pageSize: '10',
        includeIp: false
      }
    }
  ]
};

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getScopedStorageKey(scope) {
  const username = currentMe && currentMe.username ? currentMe.username : 'guest';
  return `mctools:${scope}:${username}`;
}

function readScopedStorage(scope, fallback) {
  try {
    return safeJsonParse(localStorage.getItem(getScopedStorageKey(scope)), fallback);
  } catch {
    return fallback;
  }
}

function writeScopedStorage(scope, value) {
  try {
    localStorage.setItem(getScopedStorageKey(scope), JSON.stringify(value));
  } catch {
    // Ignore storage write failure.
  }
}

function getFavoriteCommands() {
  const items = readScopedStorage('favorite-commands', []);
  return Array.isArray(items) ? items : [];
}

function setFavoriteCommands(items) {
  writeScopedStorage('favorite-commands', items);
}

function normalizeTagList(rawText) {
  return Array.from(
    new Set(
      String(rawText || '')
        .split(/[，,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 6);
}

function getHistoryTagMap() {
  const tags = readScopedStorage('history-tags', {});
  return tags && typeof tags === 'object' && !Array.isArray(tags) ? tags : {};
}

function setHistoryTagMap(map) {
  writeScopedStorage('history-tags', map);
}

function getHistoryTagsById(id) {
  const map = getHistoryTagMap();
  const tags = map[String(id)];
  return Array.isArray(tags) ? tags : [];
}

function setHistoryTagsById(id, rawText) {
  const map = getHistoryTagMap();
  const tags = normalizeTagList(rawText);

  if (tags.length) {
    map[String(id)] = tags;
  } else {
    delete map[String(id)];
  }

  setHistoryTagMap(map);
}

function getCommandPresets(commandName) {
  return COMMAND_PRESETS[commandName] || [];
}

function fillCardValues(card, values) {
  if (!card || !values) {
    return;
  }

  card.querySelectorAll('[data-field]').forEach((element) => {
    const key = element.getAttribute('data-field');

    if (!key || !(key in values)) {
      return;
    }

    if (element.type === 'checkbox') {
      element.checked = Boolean(values[key]);
      return;
    }

    element.value = values[key];
  });
}

function renderTemplateLibrary(commandName) {
  const container = document.querySelector('[data-template-list]');

  if (!container) {
    return;
  }

  const presets = getCommandPresets(commandName);

  if (!presets.length) {
    container.innerHTML = '<p class="empty-state">当前指令暂无快捷模板</p>';
    return;
  }

  container.innerHTML = presets.map((preset) => `
    <article class="template-item">
      <div>
        <strong>${escapeHtml(preset.name)}</strong>
        <p>${escapeHtml(preset.description)}</p>
      </div>
      <button type="button" class="ghost-button compact-button template-apply-button" data-template-apply="${escapeHtml(preset.id)}">套用模板</button>
    </article>
  `).join('');
}

function applyCommandPreset(commandName, presetId) {
  const presets = getCommandPresets(commandName);
  const preset = presets.find((item) => item.id === presetId);
  const card = getCurrentCard();

  if (!preset || !card) {
    return;
  }

  fillCardValues(card, preset.values);
  updateCard(card);
  setCommandAccessMessage(`已套用模板：${preset.name}`);
}

function renderFavoriteCommands() {
  const container = document.querySelector('[data-favorites-list]');

  if (!container) {
    return;
  }

  const items = getFavoriteCommands();

  if (!items.length) {
    container.innerHTML = '<p class="empty-state">还没有收藏任何指令</p>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="favorite-item">
      <div class="history-item-head">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.commandName)}</span>
      </div>
      <code>${escapeHtml(item.commandText)}</code>
      <div class="favorite-item-actions">
        <button type="button" class="ghost-button compact-button" data-favorite-apply="${escapeHtml(item.id)}">载入</button>
        <button type="button" class="ghost-button compact-button" data-favorite-copy="${escapeHtml(item.id)}">复制</button>
        <button type="button" class="history-delete" data-favorite-delete="${escapeHtml(item.id)}">删除</button>
      </div>
    </article>
  `).join('');
}

async function copyTextValue(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  }
}

async function saveCurrentFavorite(card) {
  const commandName = card ? card.getAttribute('data-command') : '';
  const output = card ? card.querySelector('[data-output]') : null;

  if (!card || !commandName || !output) {
    return;
  }

  if (!output.value.trim()) {
    updateCard(card);
  }

  const title = window.prompt('请输入收藏名称', `${COMMAND_TEMPLATES[commandName].title} 收藏`);

  if (!title) {
    return;
  }

  const items = getFavoriteCommands();
  items.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: title.trim(),
    commandName,
    commandText: output.value.trim(),
    inputs: getCardValues(card),
    createdAt: new Date().toISOString()
  });

  setFavoriteCommands(items.slice(0, 30));
  renderFavoriteCommands();
  setCommandAccessMessage('当前指令已加入收藏夹。');
}

function applyFavoriteCommand(favoriteId) {
  const favorite = getFavoriteCommands().find((item) => item.id === favoriteId);

  if (!favorite || !commandPicker || !commandHost) {
    return;
  }

  if (commandPicker.value !== favorite.commandName) {
    commandPicker.value = favorite.commandName;
    renderSelectedCommand(favorite.commandName, commandHost);
  }

  const card = getCurrentCard();
  if (!card) {
    return;
  }

  fillCardValues(card, favorite.inputs || {});
  updateCard(card);
  setCommandAccessMessage(`已载入收藏：${favorite.title}`);
}

function deleteFavoriteCommand(favoriteId) {
  const items = getFavoriteCommands().filter((item) => item.id !== favoriteId);
  setFavoriteCommands(items);
  renderFavoriteCommands();
}

function saveHistoryItemToFavorites(historyId) {
  const historyItem = currentHistoryItems.find((item) => String(item.id) === String(historyId));

  if (!historyItem) {
    return;
  }

  const items = getFavoriteCommands();
  items.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: `${historyItem.commandName} 历史收藏`,
    commandName: historyItem.commandName,
    commandText: historyItem.commandText,
    inputs: safeJsonParse(historyItem.inputJson, {}),
    createdAt: new Date().toISOString()
  });
  setFavoriteCommands(items.slice(0, 30));
  renderFavoriteCommands();
}

const COMMAND_TEMPLATES = {
  tp: {
    title: 'tp 传送',
    description: '生成玩家传送指令',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          目标玩家 / 坐标目标
          <input type="text" data-field="destination" placeholder="@s 或 x y z" value="@s" />
        </label>
      </div>
    `
  },
  give: {
    title: 'give 给予物品',
    description: '生成给玩家发放物品的指令',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          物品 ID
          <input type="text" data-field="item" placeholder="minecraft:diamond" value="minecraft:diamond" />
        </label>
      </div>
      <label>
        数量
        <input type="number" min="1" data-field="count" value="1" />
      </label>
    `
  },
  summon: {
    title: 'summon 召唤实体',
    description: '生成指定实体的召唤指令',
    fields: `
      <div class="fields two-col">
        <label>
          实体 ID
          <input type="text" data-field="entity" placeholder="minecraft:zombie" value="minecraft:zombie" />
        </label>
        <label>
          坐标
          <input type="text" data-field="pos" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
      </div>
      <label>
        额外 NBT / 参数
        <input type="text" data-field="extra" placeholder="可留空" />
      </label>
    `
  },
  effect: {
    title: 'effect 状态效果',
    description: '生成药水效果指令',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          效果 ID
          <input type="text" data-field="effect" placeholder="minecraft:speed" value="minecraft:speed" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          持续时间（秒）
          <input type="number" min="1" data-field="duration" value="30" />
        </label>
        <label>
          等级
          <input type="number" min="0" data-field="amplifier" value="1" />
        </label>
      </div>
      <label class="inline-check">
        <input type="checkbox" data-field="hideParticles" checked />
        隐藏粒子效果
      </label>
    `
  },
  time: {
    title: 'time set 设置时间',
    description: '生成世界时间指令',
    fields: `
      <label>
        时间预设
        <select data-field="preset">
          <option value="day">白天</option>
          <option value="noon">正午</option>
          <option value="night">夜晚</option>
          <option value="midnight">午夜</option>
          <option value="custom">自定义数值</option>
        </select>
      </label>
      <label>
        自定义时间值
        <input type="number" min="0" data-field="customValue" value="1000" />
      </label>
    `
  },
  gamemode: {
    title: 'gamemode 游戏模式',
    description: '生成玩家模式切换指令',
    fields: `
      <div class="fields two-col">
        <label>
          游戏模式
          <select data-field="mode">
            <option value="survival">survival 生存</option>
            <option value="creative" selected>creative 创造</option>
            <option value="adventure">adventure 冒险</option>
            <option value="spectator">spectator 观察者</option>
          </select>
        </label>
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
      </div>
    `
  },
  weather: {
    title: 'weather 天气',
    description: '生成天气切换指令',
    fields: `
      <div class="fields two-col">
        <label>
          天气类型
          <select data-field="weatherType">
            <option value="clear" selected>clear 晴天</option>
            <option value="rain">rain 下雨</option>
            <option value="thunder">thunder 雷暴</option>
          </select>
        </label>
        <label>
          持续时间（tick）
          <input type="number" min="1" data-field="duration" value="1000" />
        </label>
      </div>
    `
  },
  xp: {
    title: 'xp 经验值',
    description: '生成经验值或等级修改指令',
    fields: `
      <div class="fields two-col">
        <label>
          数值
          <input type="number" min="1" data-field="amount" value="5" />
        </label>
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
      </div>
      <label class="inline-check">
        <input type="checkbox" data-field="levelMode" />
        按等级增加（否则按经验点）
      </label>
    `
  },
  setblock: {
    title: 'setblock 放置方块',
    description: '生成单方块放置指令',
    fields: `
      <div class="fields two-col">
        <label>
          坐标
          <input type="text" data-field="pos" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
        <label>
          方块 ID
          <input type="text" data-field="block" placeholder="minecraft:stone" value="minecraft:stone" />
        </label>
      </div>
      <label>
        放置模式
        <select data-field="mode">
          <option value="replace" selected>replace 替换</option>
          <option value="destroy">destroy 破坏后放置</option>
          <option value="keep">keep 仅在空气中放置</option>
        </select>
      </label>
    `
  },
  fill: {
    title: 'fill 区域填充',
    description: '生成区域方块填充指令',
    fields: `
      <div class="fields two-col">
        <label>
          起点坐标
          <input type="text" data-field="fromPos" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
        <label>
          终点坐标
          <input type="text" data-field="toPos" placeholder="~1 ~1 ~1" value="~1 ~1 ~1" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          方块 ID
          <input type="text" data-field="block" placeholder="minecraft:stone" value="minecraft:stone" />
        </label>
        <label>
          填充模式
          <select data-field="mode">
            <option value="replace" selected>replace 替换</option>
            <option value="destroy">destroy 破坏后填充</option>
            <option value="hollow">hollow 空心</option>
            <option value="outline">outline 仅边框</option>
            <option value="keep">keep 保留已有方块</option>
          </select>
        </label>
      </div>
    `
  },
  clear: {
    title: 'clear 清空物品',
    description: '清空玩家背包中的指定物品或全部物品',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          物品 ID（留空则清空全部）
          <input type="text" data-field="item" placeholder="minecraft:stone" />
        </label>
      </div>
      <label>
        最大清除数量
        <input type="number" min="1" data-field="maxCount" value="1" />
      </label>
    `
  },
  difficulty: {
    title: 'difficulty 难度',
    description: '生成世界难度切换指令',
    fields: `
      <label>
        难度等级
        <select data-field="level">
          <option value="peaceful">peaceful 和平</option>
          <option value="easy">easy 简单</option>
          <option value="normal" selected>normal 普通</option>
          <option value="hard">hard 困难</option>
        </select>
      </label>
    `
  },
  locate: {
    title: 'locate 定位',
    description: '生成结构、生物群系或兴趣点定位指令',
    fields: `
      <div class="fields two-col">
        <label>
          定位类别
          <select data-field="category">
            <option value="structure" selected>structure 结构</option>
            <option value="biome">biome 生物群系</option>
            <option value="poi">poi 兴趣点</option>
          </select>
        </label>
        <label>
          目标 ID
          <input type="text" data-field="target" placeholder="minecraft:village" value="minecraft:village" />
        </label>
      </div>
    `
  },
  title: {
    title: 'title 标题显示',
    description: '向玩家显示标题、副标题或动作栏文字',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="targets" placeholder="@a" value="@a" />
        </label>
        <label>
          显示位置
          <select data-field="action">
            <option value="title" selected>title 标题</option>
            <option value="subtitle">subtitle 副标题</option>
            <option value="actionbar">actionbar 动作栏</option>
          </select>
        </label>
      </div>
      <label>
        文本 JSON
        <input type="text" data-field="text" value='{"text":"欢迎来到服务器"}' />
      </label>
    `
  },
  playsound: {
    title: 'playsound 播放声音',
    description: '向目标玩家播放指定音效',
    fields: `
      <div class="fields two-col">
        <label>
          声音 ID
          <input type="text" data-field="sound" placeholder="minecraft:entity.player.levelup" value="minecraft:entity.player.levelup" />
        </label>
        <label>
          声音源
          <select data-field="source">
            <option value="master" selected>master 总控</option>
            <option value="music">music 音乐</option>
            <option value="player">player 玩家</option>
            <option value="ambient">ambient 环境</option>
            <option value="hostile">hostile 敌对生物</option>
          </select>
        </label>
      </div>
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="targets" placeholder="@a" value="@a" />
        </label>
        <label>
          播放坐标
          <input type="text" data-field="pos" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          音量
          <input type="number" min="0" step="0.1" data-field="volume" value="1" />
        </label>
        <label>
          音调
          <input type="number" min="0" step="0.1" data-field="pitch" value="1" />
        </label>
      </div>
      <label>
        最小音量
        <input type="number" min="0" step="0.1" data-field="minVolume" value="0" />
      </label>
    `
  },
  particle: {
    title: 'particle 粒子',
    description: '生成粒子效果播放指令',
    fields: `
      <div class="fields two-col">
        <label>
          粒子 ID
          <input type="text" data-field="particleName" placeholder="minecraft:flame" value="minecraft:flame" />
        </label>
        <label>
          播放坐标
          <input type="text" data-field="pos" placeholder="~ ~1 ~" value="~ ~1 ~" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          扩散范围
          <input type="text" data-field="delta" placeholder="0.5 0.5 0.5" value="0.5 0.5 0.5" />
        </label>
        <label>
          速度
          <input type="number" min="0" step="0.1" data-field="speed" value="0" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          数量
          <input type="number" min="1" data-field="count" value="10" />
        </label>
        <label>
          模式
          <select data-field="mode">
            <option value="normal" selected>normal 普通</option>
            <option value="force">force 强制显示</option>
          </select>
        </label>
      </div>
      <label>
        可见目标
        <input type="text" data-field="viewers" placeholder="@a" value="@a" />
      </label>
    `
  },
  enchant: {
    title: 'enchant 附魔',
    description: '为玩家手持物品添加附魔',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          附魔 ID
          <input type="text" data-field="enchantment" placeholder="sharpness" value="sharpness" />
        </label>
      </div>
      <label>
        附魔等级
        <input type="number" min="1" data-field="level" value="3" />
      </label>
    `
  },
  gamerule: {
    title: 'gamerule 游戏规则',
    description: '生成游戏规则设置指令',
    fields: `
      <div class="fields two-col">
        <label>
          规则名称
          <input type="text" data-field="rule" placeholder="keepInventory" value="keepInventory" />
        </label>
        <label>
          规则值
          <input type="text" data-field="value" placeholder="true / false / 数值" value="true" />
        </label>
      </div>
    `
  },
  clone: {
    title: 'clone 区域复制',
    description: '复制一个区域到新的目标位置',
    fields: `
      <div class="fields two-col">
        <label>
          起点坐标
          <input type="text" data-field="begin" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
        <label>
          终点坐标
          <input type="text" data-field="end" placeholder="~5 ~5 ~5" value="~5 ~5 ~5" />
        </label>
      </div>
      <label>
        目标起点坐标
        <input type="text" data-field="destination" placeholder="~10 ~ ~10" value="~10 ~ ~10" />
      </label>
      <div class="fields two-col">
        <label>
          蒙版模式
          <select data-field="maskMode">
            <option value="replace" selected>replace 替换</option>
            <option value="masked">masked 跳过空气</option>
            <option value="filtered">filtered 过滤方块</option>
          </select>
        </label>
        <label>
          克隆模式
          <select data-field="cloneMode">
            <option value="normal" selected>normal 普通</option>
            <option value="force">force 强制</option>
            <option value="move">move 移动</option>
          </select>
        </label>
      </div>
    `
  },
  spreadplayers: {
    title: 'spreadplayers 分散玩家',
    description: '将多个玩家按范围分散到不同位置',
    fields: `
      <div class="fields two-col">
        <label>
          中心 X
          <input type="number" data-field="centerX" value="0" />
        </label>
        <label>
          中心 Z
          <input type="number" data-field="centerZ" value="0" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          最小间距
          <input type="number" min="1" step="0.1" data-field="spreadDistance" value="8" />
        </label>
        <label>
          最大范围
          <input type="number" min="1" step="0.1" data-field="maxRange" value="24" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          最高高度
          <input type="number" min="1" data-field="maxHeight" value="256" />
        </label>
        <label>
          目标玩家
          <input type="text" data-field="targets" placeholder="@a" value="@a" />
        </label>
      </div>
      <label class="inline-check">
        <input type="checkbox" data-field="respectTeams" />
        按队伍分散
      </label>
    `
  },
  executeChain: {
    title: 'execute 条件执行',
    description: 'VIP 复杂指令，适合条件检测、位置偏移后执行其他命令',
    fields: `
      <div class="fields two-col">
        <label>
          执行者
          <input type="text" data-field="executor" placeholder="@p" value="@p" />
        </label>
        <label>
          执行位置
          <input type="text" data-field="anchorPos" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          条件类型
          <select data-field="conditionType">
            <option value="ifEntity" selected>if entity 实体存在</option>
            <option value="unlessEntity">unless entity 实体不存在</option>
            <option value="ifBlock">if block 方块存在</option>
            <option value="unlessBlock">unless block 方块不存在</option>
          </select>
        </label>
        <label>
          条件参数
          <input type="text" data-field="conditionValue" placeholder="@a[tag=arena] 或 ~ ~-1 ~ minecraft:diamond_block" value="@a[tag=arena]" />
        </label>
      </div>
      <label>
        最终执行命令
        <input type="text" data-field="runCommand" placeholder="say 条件执行成功" value="say 条件执行成功" />
      </label>
    `
  },
  scoreboardObjective: {
    title: 'scoreboard objectives',
    description: 'VIP 复杂指令，用于创建计分板目标',
    fields: `
      <div class="fields two-col">
        <label>
          目标名
          <input type="text" data-field="objectiveName" placeholder="bossDamage" value="bossDamage" />
        </label>
        <label>
          统计类型
          <input type="text" data-field="criterion" placeholder="dummy" value="dummy" />
        </label>
      </div>
      <label>
        显示名称
        <input type="text" data-field="displayName" placeholder="Boss Damage" value="Boss Damage" />
      </label>
    `
  },
  scoreboardOperation: {
    title: 'scoreboard operation',
    description: 'VIP 复杂指令，用于计分板目标之间运算',
    fields: `
      <div class="fields two-col">
        <label>
          目标实体
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          目标分数项
          <input type="text" data-field="targetObjective" placeholder="coins" value="coins" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          运算符
          <select data-field="operation">
            <option value="+=" selected>+= 加</option>
            <option value="-=">-= 减</option>
            <option value="*=">*= 乘</option>
            <option value="/=">/= 除</option>
            <option value="%=">%= 取模</option>
            <option value="=">= 赋值</option>
            <option value="<">&lt; 最小值</option>
            <option value=">">&gt; 最大值</option>
            <option value="><">&gt;&lt; 交换</option>
          </select>
        </label>
        <label>
          来源实体
          <input type="text" data-field="source" placeholder="@s" value="@s" />
        </label>
      </div>
      <label>
        来源分数项
        <input type="text" data-field="sourceObjective" placeholder="bonus" value="bonus" />
      </label>
    `
  },
  itemReplace: {
    title: 'item replace 槽位替换',
    description: 'VIP 复杂指令，用于直接替换实体槽位中的物品',
    fields: `
      <div class="fields two-col">
        <label>
          目标实体
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          槽位
          <input type="text" data-field="slot" placeholder="weapon.mainhand" value="weapon.mainhand" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          物品 ID
          <input type="text" data-field="item" placeholder="minecraft:netherite_sword" value="minecraft:netherite_sword" />
        </label>
        <label>
          数量
          <input type="number" min="1" data-field="count" value="1" />
        </label>
      </div>
    `
  },
  lootTable: {
    title: 'loot 战利品生成',
    description: 'VIP 复杂指令，可从战利品表、击杀或挖掘来源生成物品',
    fields: `
      <div class="fields two-col">
        <label>
          接收目标
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          来源类型
          <select data-field="sourceType">
            <option value="loot" selected>loot 战利品表</option>
            <option value="kill">kill 击杀实体</option>
            <option value="mine">mine 挖掘方块</option>
          </select>
        </label>
      </div>
      <label>
        来源参数
        <input type="text" data-field="sourceValue" placeholder="minecraft:chests/end_city_treasure" value="minecraft:chests/end_city_treasure" />
      </label>
      <label>
        mine 模式工具物品
        <input type="text" data-field="toolItem" placeholder="minecraft:diamond_pickaxe" value="minecraft:diamond_pickaxe" />
      </label>
    `
  },
  dataMergeBlock: {
    title: 'data merge block',
    description: 'VIP 复杂指令，用于写入方块 NBT 数据',
    fields: `
      <div class="fields two-col">
        <label>
          方块坐标
          <input type="text" data-field="pos" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
        <label>
          NBT 数据
          <input type="text" data-field="nbt" placeholder='{Lock:"VIP",CustomName:"\"奖励箱\""}' value='{Lock:"VIP",CustomName:"\"奖励箱\""}' />
        </label>
      </div>
    `
  },
  dataMergeEntity: {
    title: 'data merge entity',
    description: 'VIP 复杂指令，用于写入实体 NBT 数据',
    fields: `
      <div class="fields two-col">
        <label>
          目标实体
          <input type="text" data-field="target" placeholder="@e[type=minecraft:villager,limit=1,sort=nearest]" value="@e[type=minecraft:villager,limit=1,sort=nearest]" />
        </label>
        <label>
          NBT 数据
          <input type="text" data-field="nbt" placeholder='{NoAI:1b,Invulnerable:1b}' value='{NoAI:1b,Invulnerable:1b,CustomName:"\"商人守卫\""}' />
        </label>
      </div>
    `
  },
  attributeBase: {
    title: 'attribute 属性设置',
    description: 'VIP 复杂指令，用于修改实体基础属性值',
    fields: `
      <div class="fields two-col">
        <label>
          目标实体
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          属性名称
          <input type="text" data-field="attributeName" placeholder="minecraft:generic.max_health" value="minecraft:generic.max_health" />
        </label>
      </div>
      <label>
        基础值
        <input type="number" min="0" step="0.1" data-field="value" value="40" />
      </label>
    `
  },
  scheduleFunction: {
    title: 'schedule 函数调度',
    description: 'VIP 复杂指令，用于延迟或替换函数执行计划',
    fields: `
      <div class="fields two-col">
        <label>
          函数 ID
          <input type="text" data-field="functionId" placeholder="mctools:arena/round_start" value="mctools:arena/round_start" />
        </label>
        <label>
          时间数值
          <input type="number" min="1" data-field="timeValue" value="20" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          时间单位
          <select data-field="timeUnit">
            <option value="t">t tick</option>
            <option value="s" selected>s 秒</option>
            <option value="d">d 天</option>
          </select>
        </label>
        <label>
          调度方式
          <select data-field="scheduleMode">
            <option value="replace" selected>replace 替换</option>
            <option value="append">append 追加</option>
          </select>
        </label>
      </div>
    `
  },
  fillBiome: {
    title: 'fillbiome 生物群系填充',
    description: 'VIP 复杂指令，用于批量改写区域内生物群系',
    fields: `
      <div class="fields two-col">
        <label>
          起点坐标
          <input type="text" data-field="fromPos" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
        <label>
          终点坐标
          <input type="text" data-field="toPos" placeholder="~16 ~16 ~16" value="~16 ~16 ~16" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          目标生物群系
          <input type="text" data-field="biome" placeholder="minecraft:cherry_grove" value="minecraft:cherry_grove" />
        </label>
        <label>
          仅替换指定生物群系
          <input type="text" data-field="replaceBiome" placeholder="可留空，例如 minecraft:plains" />
        </label>
      </div>
    `
  },
  snowballMenuOpen: {
    title: '雪球菜单开启',
    description: 'VIP 复杂指令，用于侦测雪球并打开一个附近玩家菜单',
    fields: `
      <div class="fields two-col">
        <label>
          雪球标签
          <input type="text" data-field="projectileTag" placeholder="menu_ball" value="menu_ball" />
        </label>
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="snowball_menu" value="snowball_menu" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          菜单分数项
          <input type="text" data-field="objectiveName" placeholder="menuSelect" value="menuSelect" />
        </label>
        <label>
          生效半径
          <input type="number" min="1" step="0.5" data-field="radius" value="5" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          初始选项分数
          <input type="number" min="1" data-field="openScore" value="1" />
        </label>
        <label>
          打开音效
          <input type="text" data-field="soundId" placeholder="minecraft:block.note_block.pling" value="minecraft:block.note_block.pling" />
        </label>
      </div>
      <label>
        动作栏提示文案
        <input type="text" data-field="titleText" placeholder="雪球菜单已开启" value="雪球菜单已开启：请切换选项" />
      </label>
    `
  },
  snowballMenuHud: {
    title: '雪球菜单显示',
    description: 'VIP 复杂指令，用于按当前分数显示 3 项菜单内容',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="snowball_menu" value="snowball_menu" />
        </label>
        <label>
          菜单分数项
          <input type="text" data-field="objectiveName" placeholder="menuSelect" value="menuSelect" />
        </label>
      </div>
      <div class="fields three-col">
        <label>
          选项 1 文案
          <input type="text" data-field="optionOneLabel" placeholder="回城" value="回城" />
        </label>
        <label>
          选项 2 文案
          <input type="text" data-field="optionTwoLabel" placeholder="补给" value="补给" />
        </label>
        <label>
          选项 3 文案
          <input type="text" data-field="optionThreeLabel" placeholder="治疗" value="治疗" />
        </label>
      </div>
    `
  },
  snowballMenuRun: {
    title: '雪球菜单执行',
    description: 'VIP 复杂指令，用于当玩家选中指定菜单项后执行命令',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="snowball_menu" value="snowball_menu" />
        </label>
        <label>
          菜单分数项
          <input type="text" data-field="objectiveName" placeholder="menuSelect" value="menuSelect" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          触发选项分数
          <input type="number" min="1" data-field="selectedScore" value="1" />
        </label>
        <label>
          冷却分数项
          <input type="text" data-field="cooldownObjective" placeholder="menuCooldown" value="menuCooldown" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          冷却 Tick
          <input type="number" min="0" data-field="cooldownTicks" value="40" />
        </label>
        <label class="inline-check">
          <input type="checkbox" data-field="clearAfterRun" checked />
          执行后移除菜单标签
        </label>
      </div>
      <label>
        执行命令
        <input type="text" data-field="runCommand" placeholder="tp @s 0 80 0" value="tp @s 0 80 0" />
      </label>
    `
  },
  banMenuOpen: {
    title: '封禁菜单开启',
    description: 'VIP 复杂指令，用于初始化管理员封禁菜单',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="ban_menu" value="ban_menu" />
        </label>
        <label>
          选项分数项
          <input type="text" data-field="objectiveName" placeholder="banSelect" value="banSelect" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          页码分数项
          <input type="text" data-field="pageObjective" placeholder="banPage" value="banPage" />
        </label>
        <label>
          管理员选择器
          <input type="text" data-field="moderatorSelector" placeholder="@p[tag=staff]" value="@p[tag=staff]" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          目标玩家名称
          <input type="text" data-field="targetName" placeholder="TargetPlayer" value="TargetPlayer" />
        </label>
        <label>
          初始选项分数
          <input type="number" min="1" data-field="openScore" value="1" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          动作栏文案
          <input type="text" data-field="titleText" placeholder="封禁菜单已开启" value="封禁菜单已开启：目标 TargetPlayer" />
        </label>
        <label>
          打开音效
          <input type="text" data-field="soundId" placeholder="minecraft:block.note_block.pling" value="minecraft:block.note_block.pling" />
        </label>
      </div>
    `
  },
  banMenuSelect: {
    title: '封禁菜单选择',
    description: 'VIP 复杂指令，用于切换封禁菜单当前选项',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="ban_menu" value="ban_menu" />
        </label>
        <label>
          菜单分数项
          <input type="text" data-field="objectiveName" placeholder="banSelect" value="banSelect" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          触发分数项
          <input type="text" data-field="triggerObjective" placeholder="banClick" value="banClick" />
        </label>
        <label>
          触发阈值
          <input type="number" min="1" data-field="triggerScore" value="1" />
        </label>
      </div>
      <div class="fields three-col">
        <label>
          切换模式
          <select data-field="mode">
            <option value="next" selected>next 下一项</option>
            <option value="prev">prev 上一项</option>
            <option value="direct">direct 指定选项</option>
          </select>
        </label>
        <label>
          总选项数
          <input type="number" min="2" data-field="optionCount" value="4" />
        </label>
        <label>
          direct 目标值
          <input type="number" min="1" data-field="selectedValue" value="1" />
        </label>
      </div>
      <label>
        切换音效
        <input type="text" data-field="soundId" placeholder="minecraft:ui.button.click" value="minecraft:ui.button.click" />
      </label>
    `
  },
  banMenuHud: {
    title: '封禁菜单显示',
    description: 'VIP 复杂指令，用于显示封禁菜单当前页的选项文案',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="ban_menu" value="ban_menu" />
        </label>
        <label>
          菜单分数项
          <input type="text" data-field="objectiveName" placeholder="banSelect" value="banSelect" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          页码分数项
          <input type="text" data-field="pageObjective" placeholder="banPage" value="banPage" />
        </label>
        <label>
          对应页码
          <input type="number" min="1" data-field="pageValue" value="1" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          选项 1 文案
          <input type="text" data-field="optionOneLabel" placeholder="24h封禁" value="24h封禁" />
        </label>
        <label>
          选项 2 文案
          <input type="text" data-field="optionTwoLabel" placeholder="永久封禁" value="永久封禁" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          选项 3 文案
          <input type="text" data-field="optionThreeLabel" placeholder="踢出玩家" value="踢出玩家" />
        </label>
        <label>
          选项 4 文案
          <input type="text" data-field="optionFourLabel" placeholder="解封玩家" value="解封玩家" />
        </label>
      </div>
    `
  },
  banMenuPage: {
    title: '封禁菜单翻页',
    description: 'VIP 复杂指令，用于切换封禁菜单页码',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="ban_menu" value="ban_menu" />
        </label>
        <label>
          页码分数项
          <input type="text" data-field="pageObjective" placeholder="banPage" value="banPage" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          触发分数项
          <input type="text" data-field="triggerObjective" placeholder="banPageClick" value="banPageClick" />
        </label>
        <label>
          触发阈值
          <input type="number" min="1" data-field="triggerScore" value="1" />
        </label>
      </div>
      <div class="fields three-col">
        <label>
          翻页模式
          <select data-field="direction">
            <option value="next" selected>next 下一页</option>
            <option value="prev">prev 上一页</option>
            <option value="direct">direct 指定页</option>
          </select>
        </label>
        <label>
          最大页码
          <input type="number" min="2" data-field="maxPage" value="2" />
        </label>
        <label>
          direct 目标页
          <input type="number" min="1" data-field="directPage" value="1" />
        </label>
      </div>
      <label>
        翻页音效
        <input type="text" data-field="soundId" placeholder="minecraft:item.book.page_turn" value="minecraft:item.book.page_turn" />
      </label>
    `
  },
  banMenuBan: {
    title: '封禁菜单执行封禁',
    description: 'VIP 复杂指令，用于执行临时或永久封禁',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="ban_menu" value="ban_menu" />
        </label>
        <label>
          菜单分数项
          <input type="text" data-field="objectiveName" placeholder="banSelect" value="banSelect" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          对应选项分数
          <input type="number" min="1" data-field="selectedScore" value="1" />
        </label>
        <label>
          目标玩家名称
          <input type="text" data-field="targetName" placeholder="TargetPlayer" value="TargetPlayer" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          封禁类型
          <select data-field="banMode">
            <option value="tempban" selected>tempban 临时封禁</option>
            <option value="permaban">ban 永久封禁</option>
          </select>
        </label>
        <label>
          临时封禁时长
          <input type="text" data-field="durationText" placeholder="24h" value="24h" />
        </label>
      </div>
      <div class="quick-fill-group">
        <span class="quick-fill-label">时长快捷</span>
        <div class="quick-fill-row">
          <button type="button" class="ghost-button compact-button quick-fill-button" data-fill-field="durationText" data-fill-value="1h">1 小时</button>
          <button type="button" class="ghost-button compact-button quick-fill-button" data-fill-field="durationText" data-fill-value="12h">12 小时</button>
          <button type="button" class="ghost-button compact-button quick-fill-button" data-fill-field="durationText" data-fill-value="24h">24 小时</button>
          <button type="button" class="ghost-button compact-button quick-fill-button" data-fill-field="durationText" data-fill-value="7d">7 天</button>
        </div>
      </div>
      <div class="fields two-col">
        <label>
          原因
          <input type="text" data-field="reason" placeholder="违反服务器规则" value="违反服务器规则" />
        </label>
        <label class="inline-check">
          <input type="checkbox" data-field="clearAfterRun" checked />
          执行后移除菜单标签
        </label>
      </div>
      <div class="quick-fill-group">
        <span class="quick-fill-label">理由预设</span>
        <div class="quick-fill-row">
          <button type="button" class="ghost-button compact-button quick-fill-button" data-fill-field="reason" data-fill-value="作弊与使用非法客户端">作弊</button>
          <button type="button" class="ghost-button compact-button quick-fill-button" data-fill-field="reason" data-fill-value="恶意破坏与影响其他玩家体验">恶意破坏</button>
          <button type="button" class="ghost-button compact-button quick-fill-button" data-fill-field="reason" data-fill-value="辱骂、刷屏或不当言论">言语违规</button>
          <button type="button" class="ghost-button compact-button quick-fill-button" data-fill-field="reason" data-fill-value="多次违规且拒不整改">多次违规</button>
        </div>
      </div>
    `
  },
  banMenuKick: {
    title: '封禁菜单执行踢出',
    description: 'VIP 复杂指令，用于执行踢出操作',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="ban_menu" value="ban_menu" />
        </label>
        <label>
          菜单分数项
          <input type="text" data-field="objectiveName" placeholder="banSelect" value="banSelect" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          对应选项分数
          <input type="number" min="1" data-field="selectedScore" value="3" />
        </label>
        <label>
          目标玩家名称
          <input type="text" data-field="targetName" placeholder="TargetPlayer" value="TargetPlayer" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          踢出原因
          <input type="text" data-field="reason" placeholder="请先联系管理员" value="请先联系管理员" />
        </label>
        <label class="inline-check">
          <input type="checkbox" data-field="clearAfterRun" checked />
          执行后移除菜单标签
        </label>
      </div>
    `
  },
  banMenuUnban: {
    title: '封禁菜单执行解封',
    description: 'VIP 复杂指令，用于执行解封操作',
    fields: `
      <div class="fields two-col">
        <label>
          菜单标签
          <input type="text" data-field="menuTag" placeholder="ban_menu" value="ban_menu" />
        </label>
        <label>
          菜单分数项
          <input type="text" data-field="objectiveName" placeholder="banSelect" value="banSelect" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          对应选项分数
          <input type="number" min="1" data-field="selectedScore" value="4" />
        </label>
        <label>
          目标玩家名称
          <input type="text" data-field="targetName" placeholder="TargetPlayer" value="TargetPlayer" />
        </label>
      </div>
      <label class="inline-check">
        <input type="checkbox" data-field="clearAfterRun" checked />
        执行后移除菜单标签
      </label>
    `
  },
  banRecordQuery: {
    title: '封禁记录查询',
    description: 'VIP 复杂指令，用于生成常见服务端封禁记录查询命令',
    fields: `
      <div class="fields two-col">
        <label>
          服务端插件
          <select data-field="pluginType">
            <option value="vanilla">vanilla 原版</option>
            <option value="litebans" selected>LiteBans</option>
            <option value="advancedban">AdvancedBan</option>
          </select>
        </label>
        <label>
          查询类型
          <select data-field="queryMode">
            <option value="history" selected>history 历史记录</option>
            <option value="check">check 当前状态</option>
            <option value="list">list 列表查询</option>
            <option value="iplist">iplist IP 封禁列表</option>
          </select>
        </label>
      </div>
      <div class="fields two-col">
        <label>
          目标玩家名称
          <input type="text" data-field="targetName" placeholder="TargetPlayer" value="TargetPlayer" />
        </label>
        <label>
          页码
          <input type="number" min="1" data-field="page" value="1" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          每页数量
          <input type="number" min="1" data-field="pageSize" value="10" />
        </label>
        <label class="inline-check">
          <input type="checkbox" data-field="includeIp" />
          原版 banlist 时附带 IP 列表
        </label>
      </div>
    `
  }
};

function isVipOnlyCommand(commandName) {
  return VIP_COMPLEX_COMMANDS.has(commandName);
}

function hasVipCommandAccess(commandName) {
  return !isVipOnlyCommand(commandName) || Boolean(currentMe && currentMe.vipPurchased);
}

function setCommandAccessMessage(text) {
  const message = document.querySelector('[data-command-access-message]');

  if (message) {
    message.textContent = text;
  }
}

function getCardValues(card) {
  const values = {};

  card.querySelectorAll('[data-field]').forEach((element) => {
    const key = element.getAttribute('data-field');

    if (!key) {
      return;
    }

    if (element.type === 'checkbox') {
      values[key] = element.checked;
      return;
    }

    values[key] = element.value;
  });

  return values;
}

function buildCommandTemplate(commandName) {
  const template = COMMAND_TEMPLATES[commandName];
  const vipOnly = isVipOnlyCommand(commandName);
  const hasAccess = hasVipCommandAccess(commandName);

  if (!template) {
    return '';
  }

  return `
    <article class="command-card ${vipOnly ? 'vip-only' : ''} ${!hasAccess ? 'locked' : ''}" data-command="${commandName}">
      <div class="card-head">
        <div class="command-title-row">
          <h2>${template.title}</h2>
          ${vipOnly ? '<span class="command-vip-tag">VIP复杂指令</span>' : ''}
        </div>
        <span>${template.description}</span>
      </div>
      ${vipOnly && !hasAccess ? '<p class="command-lock-note">当前是工具箱中的 VIP 复杂指令，开通 VIP 后即可填写参数、生成并保存到历史。</p>' : ''}
      ${template.fields}
      <label>
        生成结果
        <textarea data-output readonly rows="2"></textarea>
      </label>
      <div class="button-row button-row-wide">
        <button type="button" class="copy-btn" data-generate>生成指令</button>
        <button type="button" class="copy-btn secondary" data-copy>复制结果</button>
        <button type="button" class="copy-btn secondary" data-save-favorite>收藏当前配置</button>
      </div>
    </article>
  `;
}

function updateCard(card) {
  const commandName = card.getAttribute('data-command');
  const output = card.querySelector('[data-output]');

  if (!commandName || !output) {
    return;
  }

  if (!hasVipCommandAccess(commandName)) {
    output.value = '开通 VIP 后可解锁这条复杂指令';
    return;
  }

  output.value = COMMANDS[commandName](getCardValues(card));
}

function setupCard(card) {
  const output = card.querySelector('[data-output]');
  const generateButton = card.querySelector('[data-generate]');
  const copyButton = card.querySelector('[data-copy]');
  const commandName = card.getAttribute('data-command') || '';
  const hasAccess = hasVipCommandAccess(commandName);

  if (!hasAccess) {
    card.querySelectorAll('[data-field]').forEach((element) => {
      element.disabled = true;
    });

    if (generateButton) {
      generateButton.disabled = true;
    }

    if (copyButton) {
      copyButton.disabled = true;
    }

    if (output) {
      output.value = '开通 VIP 后可解锁这条复杂指令';
    }

    return;
  }

  if (generateButton) {
    generateButton.addEventListener('click', () => updateCard(card));
  }

  if (copyButton && output) {
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(output.value);
        copyButton.textContent = '已复制';
        window.setTimeout(() => {
          copyButton.textContent = '复制指令';
        }, 1200);
      } catch {
        output.select();
        document.execCommand('copy');
        copyButton.textContent = '已复制';
        window.setTimeout(() => {
          copyButton.textContent = '复制指令';
        }, 1200);
      }
    });
  }

  updateCard(card);
}

async function saveCurrentCommand(card) {
  const commandName = card.getAttribute('data-command');
  const output = card.querySelector('[data-output]');

  if (!commandName || !output) {
    return;
  }

  const response = await fetch('/api/commands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commandName,
      commandText: output.value,
      inputs: getCardValues(card)
    })
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({ message: '指令保存失败' }));
    throw new Error(result.message || '指令保存失败');
  }
}

function renderSelectedCommand(commandName, host) {
  host.innerHTML = buildCommandTemplate(commandName);
  const card = host.querySelector('.command-card');
  renderTemplateLibrary(commandName);

  if (isVipOnlyCommand(commandName)) {
    setCommandAccessMessage(
      hasVipCommandAccess(commandName)
        ? '当前是工具箱中的 VIP 复杂指令，生成结果会正常保存到历史记录。'
        : '当前是工具箱中的 VIP 复杂指令，未开通 VIP 时仅可查看，无法生成与保存。'
    );
  } else {
    setCommandAccessMessage('工具箱第一阶段先做指令。基础指令对所有已登录用户开放，21 条复杂指令为 VIP 专用。');
  }


function applyQuickFill(fieldName, fieldValue) {
  const card = getCurrentCard();

  if (!card || !fieldName) {
    return;
  }

  const field = card.querySelector(`[data-field="${fieldName}"]`);

  if (!field) {
    return;
  }

  field.value = fieldValue;
  updateCard(card);
}
  if (card) {
    setupCard(card);
  }
}

function getCurrentCard() {
  return document.querySelector('[data-command-host] .command-card');
}

async function generateCurrentCommand() {
  const card = getCurrentCard();
  const commandName = card ? card.getAttribute('data-command') : '';

  if (!card) {
    return;
  }

  if (!hasVipCommandAccess(commandName)) {
    setCommandAccessMessage('这条复杂指令仅限 VIP 使用，请先开通 VIP。');
    return;
  }

  updateCard(card);
  try {
    await saveCurrentCommand(card);
    if (isVipOnlyCommand(commandName)) {
      setCommandAccessMessage('VIP 复杂指令已生成，并已写入工具箱历史记录。');
    }
  } catch {
    setCommandAccessMessage('当前指令保存失败，可能需要先开通VIP后才能写入历史。');
  }
}

function refreshCommandAccess() {
  if (commandPicker && commandHost) {
    renderSelectedCommand(commandPicker.value, commandHost);
  }
}

async function fetchMe() {
  const response = await fetch('/api/me');

  if (!response.ok) {
    window.location.href = '/login.html';
    return null;
  }

  return response.json();
}

async function purchaseVip() {
  const response = await fetch('/api/vip/purchase', { method: 'POST' });

  if (!response.ok) {
    throw new Error('VIP 购买失败');
  }

  return response.json();
}

async function purchaseSvip() {
  const response = await fetch('/api/svip/purchase', { method: 'POST' });

  if (!response.ok) {
    throw new Error('SVIP 购买失败');
  }

  return response.json();
}

async function uploadAvatar(imageData) {
  const response = await fetch('/api/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData })
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({ message: '头像上传失败' }));
    throw new Error(result.message || '头像上传失败');
  }

  return response.json();
}

async function deleteHistoryItem(id) {
  const response = await fetch('/api/commands/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });

  if (!response.ok) {
    throw new Error('历史删除失败');
  }
}

async function clearAllHistory() {
  const response = await fetch('/api/commands/clear', {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('历史清空失败');
  }
}

async function deleteAvatar() {
  const response = await fetch('/api/avatar/delete', {
    method: 'POST'
  });

  const result = await response.json().catch(() => ({ message: '头像删除失败' }));

  if (!response.ok) {
    throw new Error(result.message || '头像删除失败');
  }

  return result;
}

function updateAvatar(profile) {
  const avatarImage = document.querySelector('[data-avatar-image]');
  const avatarFallback = document.querySelector('[data-avatar-fallback]');
  const profileName = document.querySelector('[data-profile-name]');
  const avatarDeleteButton = document.querySelector('[data-avatar-delete]');
  const username = profile && profile.username ? profile.username : '未登录';
  const avatarUrl = profile && profile.avatarUrl ? `${profile.avatarUrl}?t=${Date.now()}` : '';

  if (profileName) {
    profileName.textContent = username;
  }

  if (avatarImage && avatarFallback) {
    if (avatarUrl) {
      avatarImage.src = avatarUrl;
      avatarImage.hidden = false;
      avatarFallback.hidden = true;
    } else {
      avatarImage.hidden = true;
      avatarFallback.hidden = false;
      avatarFallback.textContent = username.slice(0, 1) || '头';
    }
  }

  if (avatarDeleteButton) {
    avatarDeleteButton.disabled = !avatarUrl;
  }
}

function syncMaintenancePanel(me) {
  const panel = document.querySelector('[data-maintenance-panel]');

  if (!panel) {
    return;
  }

  const state = panel.querySelector('[data-maintenance-state]');
  const note = panel.querySelector('[data-maintenance-note]');
  const enableButton = panel.querySelector('[data-maintenance-enable]');
  const disableButton = panel.querySelector('[data-maintenance-disable]');
  const isEnabled = Boolean(me && me.maintenanceEnabled);

  if (state) {
    state.classList.toggle('maintenance-active', isEnabled);
    state.textContent = isEnabled
      ? '当前状态：维护中，仅维护账号可继续访问。'
      : '当前状态：正常开放，普通用户可继续访问。';
  }

  if (note) {
    note.textContent = isEnabled
      ? '维护模式已开启。普通账号的新请求会被拦截，页面会跳回登录页。'
      : '维护模式已关闭。开启后，只有维护账号还能继续使用工具箱。';
  }

  if (enableButton) {
    enableButton.disabled = isEnabled;
  }

  if (disableButton) {
    disableButton.disabled = !isEnabled;
  }
}

function renderMaintenancePanel(me) {
  const heroCard = document.querySelector('.hero-card');
  let panel = document.querySelector('[data-maintenance-panel]');

  if (!heroCard) {
    return;
  }

  if (!me || !me.isMaintenanceAdmin) {
    if (panel) {
      panel.remove();
    }
    return;
  }

  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'maintenance-panel';
    panel.setAttribute('data-maintenance-panel', '');
    panel.innerHTML = `
      <p class="panel-label">维护控制</p>
      <p class="maintenance-state" data-maintenance-state>当前状态：读取中</p>
      <p class="tool-card-note" data-maintenance-note>只有维护账号可以切换当前维护状态。</p>
      <div class="maintenance-actions">
        <button type="button" class="ghost-button compact-button" data-maintenance-enable>开启维护</button>
        <button type="button" class="ghost-button compact-button" data-maintenance-disable>关闭维护</button>
      </div>
    `;
    heroCard.appendChild(panel);

    const enableButton = panel.querySelector('[data-maintenance-enable]');
    const disableButton = panel.querySelector('[data-maintenance-disable]');

    if (enableButton) {
      enableButton.addEventListener('click', () => {
        updateMaintenanceMode(true);
      });
    }

    if (disableButton) {
      disableButton.addEventListener('click', () => {
        updateMaintenanceMode(false);
      });
    }
  }

  syncMaintenancePanel(me);
}

function renderDeveloperPanel(me) {
  const heroCard = document.querySelector('.hero-card');
  let panel = document.querySelector('[data-developer-panel]');

  if (!heroCard) {
    return;
  }

  if (!me || !me.isDeveloper) {
    if (panel) {
      panel.remove();
    }
    return;
  }

  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'developer-panel';
    panel.setAttribute('data-developer-panel', '');
    panel.innerHTML = `
      <p class="panel-label">开发者控制台</p>
      <p class="tool-card-note">开发者账号可查看项目文本代码文件，并在网页内直接保存修改。</p>
      <a class="ghost-link-button" href="/developer.html">进入开发者控制台</a>
    `;
    heroCard.appendChild(panel);
  }
}

async function updateMaintenanceMode(enabled) {
  const panel = document.querySelector('[data-maintenance-panel]');
  const state = panel ? panel.querySelector('[data-maintenance-state]') : null;
  const enableButton = panel ? panel.querySelector('[data-maintenance-enable]') : null;
  const disableButton = panel ? panel.querySelector('[data-maintenance-disable]') : null;

  if (enableButton) {
    enableButton.disabled = true;
  }

  if (disableButton) {
    disableButton.disabled = true;
  }

  if (state) {
    state.textContent = enabled ? '当前状态：正在开启维护...' : '当前状态：正在关闭维护...';
  }

  try {
    const response = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });

    const result = await response.json().catch(() => ({ message: '维护状态更新失败' }));

    if (!response.ok) {
      throw new Error(result.message || '维护状态更新失败');
    }

    updateVipState(result);
  } catch (error) {
    if (state) {
      state.textContent = `维护状态更新失败：${error.message || '未知错误'}`;
      state.classList.add('maintenance-active');
    }

    if (currentMe) {
      syncMaintenancePanel(currentMe);
    }
  }
}

function updateVipState(me) {
  const vipState = document.querySelector('[data-vip-state]');
  const memberState = document.querySelector('[data-member-state]');
  const purchaseButton = document.querySelector('[data-vip-purchase]');
  const svipPurchaseButton = document.querySelector('[data-svip-purchase]');
  const aiPanel = document.querySelector('[data-ai-panel]');
  const aiLock = document.querySelector('[data-ai-lock]');
  const aiMessage = document.querySelector('[data-ai-message]');
  const aiTierMessage = document.querySelector('[data-ai-tier-message]');
  const aiPrompt = document.querySelector('[data-ai-prompt]');
  const aiGenerateButton = document.querySelector('[data-ai-generate]');
  const aiCopyButton = document.querySelector('[data-ai-copy]');
  const executorPanel = document.querySelector('[data-executor-panel]');
  const executorLock = document.querySelector('[data-executor-lock]');
  const executorMessage = document.querySelector('[data-executor-message]');
  const executorInput = document.querySelector('[data-executor-input]');
  const executorRunButton = document.querySelector('[data-executor-run]');
  const executorCopyButton = document.querySelector('[data-executor-copy]');
  const vipCategoryCard = document.querySelector('[data-vip-category-card]');
  const vipCategoryLink = document.querySelector('[data-vip-category-link]');
  const vipCategoryNote = document.querySelector('[data-vip-category-note]');
  const accountPill = document.querySelector('[data-account-pill]');
  const isVipActive = Boolean(me.vipPurchased);
  const isSvipActive = Boolean(me.svipPurchased);

  if (memberState) {
    memberState.classList.toggle('vip-active', isVipActive);
    memberState.classList.toggle('svip-active', isSvipActive);
    memberState.textContent = `会员等级：${me.membershipLevel === 'SVIP' ? 'SVIP' : me.membershipLevel === 'VIP' ? 'VIP' : '普通用户'}`;
  }

  if (vipState) {
    vipState.classList.toggle('vip-active', isVipActive);
    vipState.classList.toggle('svip-active', isSvipActive);
    vipState.textContent = isSvipActive
      ? `VIP 状态：已升级为 SVIP（30 元，${me.svipPurchasedAt || '已记录'}）`
      : isVipActive
      ? `VIP 状态：已开通（10 元，${me.vipPurchasedAt || '已记录'}）`
      : 'VIP 状态：未开通';
  }

  if (accountPill) {
    accountPill.classList.toggle('vip-active', isVipActive);
    accountPill.classList.toggle('svip-active', isSvipActive);
    const roleTags = [];

    if (me.isMaintenanceAdmin) {
      roleTags.push('维护账号');
    }

    if (me.isDeveloper) {
      roleTags.push('开发者');
    }

    accountPill.textContent = roleTags.length
      ? `当前账号：${me.username} · ${roleTags.join(' / ')}`
      : `当前账号：${me.username}`;
  }

  if (purchaseButton) {
    purchaseButton.classList.toggle('vip-button-active', isVipActive && !isSvipActive);
    purchaseButton.textContent = isVipActive ? 'VIP 已开通' : '购买 VIP 10 元';
    purchaseButton.disabled = isVipActive;
  }

  if (svipPurchaseButton) {
    svipPurchaseButton.classList.toggle('svip-button-active', isSvipActive);
    svipPurchaseButton.textContent = isSvipActive
      ? 'SVIP 已开通'
      : isVipActive
      ? '升级 SVIP 10 元'
      : '购买 SVIP 25 元';
    svipPurchaseButton.disabled = isSvipActive;
  }

  if (aiPanel) {
    aiPanel.classList.toggle('locked', !isSvipActive);
    aiPanel.classList.toggle('vip-enabled', false);
    aiPanel.classList.toggle('svip-enabled', isSvipActive);
  }

  if (aiLock) {
    aiLock.classList.toggle('vip-active', false);
    aiLock.classList.toggle('svip-active', isSvipActive);
    aiLock.textContent = isSvipActive ? 'SVIP AI 已解锁' : '仅 SVIP 可使用';
  }

  if (aiMessage) {
    aiMessage.textContent = isSvipActive
      ? '你可以直接提问，AI 会返回中文答案。'
      : '升级 SVIP 后即可使用 AI 问答助手';
  }

  if (aiTierMessage) {
    aiTierMessage.textContent = isSvipActive
      ? '服务端会优先尝试调用 Gemini 3.1 Pro，失败后自动回退到可用模型。'
      : 'SVIP 专享问答：可直接询问指令、玩法、红石、服务器配置等问题。';
  }

  if (aiPrompt) {
    aiPrompt.disabled = !isSvipActive;
  }

  if (aiGenerateButton) {
    aiGenerateButton.disabled = !isSvipActive;
  }

  if (aiCopyButton) {
    aiCopyButton.disabled = !isSvipActive;
  }

  if (executorPanel) {
    executorPanel.classList.toggle('locked', !isSvipActive);
    executorPanel.classList.toggle('svip-enabled', isSvipActive);
  }

  if (executorLock) {
    executorLock.classList.toggle('svip-active', isSvipActive);
    executorLock.textContent = isSvipActive ? 'SVIP 指令执行器已解锁' : '仅 SVIP 可使用';
  }

  if (executorMessage) {
    executorMessage.textContent = isSvipActive
      ? '可输入任意指令进行模拟执行并记录到历史'
      : '升级 SVIP 后即可使用指令执行器';
  }

  if (executorInput) {
    executorInput.disabled = !isSvipActive;
  }

  if (executorRunButton) {
    executorRunButton.disabled = !isSvipActive;
  }

  if (executorCopyButton) {
    executorCopyButton.disabled = !isSvipActive;
  }

  if (vipCategoryCard) {
    vipCategoryCard.classList.toggle('tool-card-active', isVipActive);
    vipCategoryCard.classList.toggle('tool-card-locked', !isVipActive);
  }

  if (vipCategoryLink) {
    vipCategoryLink.classList.toggle('disabled', !isVipActive);
    vipCategoryLink.textContent = isVipActive ? '进入坐标工具' : '购买 VIP 后进入';
    if (!isVipActive) {
      vipCategoryLink.setAttribute('aria-disabled', 'true');
    } else {
      vipCategoryLink.removeAttribute('aria-disabled');
    }
  }

  if (vipCategoryNote) {
    vipCategoryNote.textContent = isVipActive
      ? 'VIP 已解锁，可进入坐标工具。'
      : '当前为 VIP 专用入口。';
  }

  currentMe = me;
  renderMaintenancePanel(me);
  renderDeveloperPanel(me);
  refreshCommandAccess();
}

async function loadCommandHistory(keyword = '') {
  const historyList = document.querySelector('[data-history-list]');
  const historyTagFilter = document.querySelector('[data-history-tag]');

  if (!historyList) {
    return;
  }

  const params = new URLSearchParams({ limit: '30' });

  if (keyword.trim()) {
    params.set('keyword', keyword.trim());
  }

  const response = await fetch(`/api/commands?${params.toString()}`);

  if (!response.ok) {
    historyList.innerHTML = '<p class="empty-state">暂时无法加载指令记录</p>';
    return;
  }

  const result = await response.json();
  const rawItems = result.items || [];
  const tagKeyword = historyTagFilter ? historyTagFilter.value.trim().toLowerCase() : '';
  currentHistoryItems = rawItems;
  const items = rawItems.filter((item) => {
    if (!tagKeyword) {
      return true;
    }

    return getHistoryTagsById(item.id).some((tag) => tag.toLowerCase().includes(tagKeyword));
  });

  if (!items.length) {
    historyList.innerHTML = `<p class="empty-state">${tagKeyword ? '当前标签筛选下没有匹配记录' : '还没有保存过指令'}</p>`;
    return;
  }

  historyList.innerHTML = items.map((item) => `
    <article class="history-item">
      <div class="history-item-head">
        <strong>${escapeHtml(item.commandName)}</strong>
        <span>${escapeHtml(item.createdAt)}</span>
      </div>
      <code>${escapeHtml(item.commandText)}</code>
      <div class="history-tag-list">${getHistoryTagsById(item.id).map((tag) => `<span class="history-tag">${escapeHtml(tag)}</span>`).join('') || '<span class="history-tag muted">未设置标签</span>'}</div>
      <div class="history-tag-editor">
        <input type="text" class="history-tag-input" data-history-tag-input="${item.id}" value="${escapeHtml(getHistoryTagsById(item.id).join(', '))}" placeholder="输入标签，空格或逗号分隔" />
        <button type="button" class="ghost-button compact-button" data-history-tag-save="${item.id}">保存标签</button>
      </div>
      <div class="favorite-item-actions">
        <button type="button" class="ghost-button compact-button" data-history-favorite="${item.id}">加入收藏</button>
        <button type="button" class="history-delete" data-history-delete="${item.id}">删除</button>
      </div>
    </article>
  `).join('');
}

async function handleLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

async function generateAi() {
  const promptInput = document.querySelector('[data-ai-prompt]');
  const output = document.querySelector('[data-ai-output]');
  const message = document.querySelector('[data-ai-message]');

  if (!promptInput || !output) {
    return;
  }

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: promptInput.value })
    });

    const result = await response.json();

    if (!response.ok) {
      if (message) {
        message.textContent = result.message || 'AI 生成失败';
      }
      if (response.status === 403) {
        window.location.reload();
      }
      return;
    }

    output.value = result.answer || '';

    if (message) {
      message.textContent = `${result.aiTier || 'SVIP'} · ${result.model || 'Gemini'} · 回复完成`;
    }
  } catch {
    if (message) {
      message.textContent = 'AI 请求失败';
    }
  }
}

function copyAiOutput() {
  const output = document.querySelector('[data-ai-output]');

  if (!output) {
    return;
  }

  navigator.clipboard.writeText(output.value).catch(() => {
    output.select();
    document.execCommand('copy');
  });
}

async function runExecutor() {
  const input = document.querySelector('[data-executor-input]');
  const output = document.querySelector('[data-executor-output]');
  const message = document.querySelector('[data-executor-message]');

  if (!input || !output) {
    return;
  }

  try {
    const response = await fetch('/api/executor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandText: input.value })
    });

    const result = await response.json().catch(() => ({ message: '执行失败' }));

    if (!response.ok) {
      if (message) {
        message.textContent = result.message || '执行失败';
      }

      if (response.status === 401) {
        window.location.href = '/login.html';
      }

      return;
    }

    output.value = result.commandText || '';

    if (message) {
      message.textContent = result.summary || result.message || '执行完成';
    }

    await loadCommandHistory(historyKeyword ? historyKeyword.value : '');
  } catch {
    if (message) {
      message.textContent = '执行请求失败';
    }
  }
}

function copyExecutorOutput() {
  const output = document.querySelector('[data-executor-output]');

  if (!output) {
    return;
  }

  navigator.clipboard.writeText(output.value).catch(() => {
    output.select();
    document.execCommand('copy');
  });
}

const commandPicker = document.querySelector('[data-command-picker]');
const commandHost = document.querySelector('[data-command-host]');
const logoutButton = document.querySelector('[data-logout]');
const accountPill = document.querySelector('[data-account-pill]');
const historyRefresh = document.querySelector('[data-history-refresh]');
const historyKeyword = document.querySelector('[data-history-keyword]');
const historyTagFilter = document.querySelector('[data-history-tag]');
const vipPurchaseButton = document.querySelector('[data-vip-purchase]');
const svipPurchaseButton = document.querySelector('[data-svip-purchase]');
const aiGenerateButton = document.querySelector('[data-ai-generate]');
const aiCopyButton = document.querySelector('[data-ai-copy]');
const executorRunButton = document.querySelector('[data-executor-run]');
const executorCopyButton = document.querySelector('[data-executor-copy]');
const avatarInput = document.querySelector('[data-avatar-input]');
const avatarDeleteButton = document.querySelector('[data-avatar-delete]');
const historyClearButton = document.querySelector('[data-history-clear]');

if (commandPicker && commandHost) {
  renderSelectedCommand(commandPicker.value, commandHost);

  commandPicker.addEventListener('change', () => {
    renderSelectedCommand(commandPicker.value, commandHost);
  });

  document.addEventListener('click', async (event) => {
    const templateButton = event.target.closest('[data-template-apply]');

    if (templateButton && commandPicker) {
      applyCommandPreset(commandPicker.value, templateButton.getAttribute('data-template-apply') || '');
      return;
    }

    const quickFillButton = event.target.closest('[data-fill-field]');

    if (quickFillButton) {
      applyQuickFill(
        quickFillButton.getAttribute('data-fill-field') || '',
        quickFillButton.getAttribute('data-fill-value') || ''
      );
      return;
    }

    const saveFavoriteButton = event.target.closest('[data-save-favorite]');

    if (saveFavoriteButton) {
      const card = getCurrentCard();
      if (card) {
        await saveCurrentFavorite(card);
      }
      return;
    }

    const favoriteApplyButton = event.target.closest('[data-favorite-apply]');

    if (favoriteApplyButton) {
      applyFavoriteCommand(favoriteApplyButton.getAttribute('data-favorite-apply') || '');
      return;
    }

    const favoriteCopyButton = event.target.closest('[data-favorite-copy]');

    if (favoriteCopyButton) {
      const favorite = getFavoriteCommands().find((item) => item.id === (favoriteCopyButton.getAttribute('data-favorite-copy') || ''));
      if (favorite) {
        await copyTextValue(favorite.commandText);
      }
      return;
    }

    const favoriteDeleteButton = event.target.closest('[data-favorite-delete]');

    if (favoriteDeleteButton) {
      deleteFavoriteCommand(favoriteDeleteButton.getAttribute('data-favorite-delete') || '');
      return;
    }

    const historyTagSaveButton = event.target.closest('[data-history-tag-save]');

    if (historyTagSaveButton) {
      const historyId = historyTagSaveButton.getAttribute('data-history-tag-save') || '';
      const input = document.querySelector(`[data-history-tag-input="${historyId}"]`);
      setHistoryTagsById(historyId, input ? input.value : '');
      await loadCommandHistory(historyKeyword ? historyKeyword.value : '');
      return;
    }

    const historyFavoriteButton = event.target.closest('[data-history-favorite]');

    if (historyFavoriteButton) {
      saveHistoryItemToFavorites(historyFavoriteButton.getAttribute('data-history-favorite') || '');
      return;
    }

    const button = event.target.closest('[data-generate]');

    if (!button) {
      const deleteButton = event.target.closest('[data-history-delete]');

      if (!deleteButton) {
        return;
      }

      await deleteHistoryItem(Number.parseInt(deleteButton.getAttribute('data-history-delete'), 10));
      await loadCommandHistory(historyKeyword ? historyKeyword.value : '');
      return;
    }

    await generateCurrentCommand();
    await loadCommandHistory(historyKeyword ? historyKeyword.value : '');
  });
}

document.addEventListener('click', (event) => {
  const vipLink = event.target.closest('[data-vip-category-link]');

  if (!vipLink) {
    return;
  }

  if (!currentMe || !currentMe.vipPurchased) {
    event.preventDefault();
  }
});

if (logoutButton) {
  logoutButton.addEventListener('click', handleLogout);
}

if (vipPurchaseButton) {
  vipPurchaseButton.addEventListener('click', async () => {
    try {
      const result = await purchaseVip();
      if (accountPill) {
        accountPill.textContent = `当前账号：${result.username || '未知'}`;
      }
      updateVipState(result);
    } catch {
      window.location.href = '/login.html';
    }
  });
}

if (svipPurchaseButton) {
  svipPurchaseButton.addEventListener('click', async () => {
    try {
      const result = await purchaseSvip();
      if (accountPill) {
        accountPill.textContent = `当前账号：${result.username || '未知'}`;
      }
      updateVipState(result);
    } catch {
      window.location.href = '/login.html';
    }
  });
}

if (historyRefresh) {
  historyRefresh.addEventListener('click', () => loadCommandHistory(historyKeyword ? historyKeyword.value : ''));
}

if (historyClearButton) {
  historyClearButton.addEventListener('click', async () => {
    const confirmed = window.confirm('确认清空当前账号的全部指令历史吗？');

    if (!confirmed) {
      return;
    }

    try {
      await clearAllHistory();
      await loadCommandHistory(historyKeyword ? historyKeyword.value : '');
    } catch {
      // Ignore and keep current history list.
    }
  });
}

if (historyKeyword) {
  historyKeyword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadCommandHistory(historyKeyword.value);
    }
  });
}

if (historyTagFilter) {
  historyTagFilter.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadCommandHistory(historyKeyword ? historyKeyword.value : '');
    }
  });
}

if (aiGenerateButton) {
  aiGenerateButton.addEventListener('click', generateAi);
}

if (aiCopyButton) {
  aiCopyButton.addEventListener('click', copyAiOutput);
}

if (executorRunButton) {
  executorRunButton.addEventListener('click', runExecutor);
}

if (executorCopyButton) {
  executorCopyButton.addEventListener('click', copyExecutorOutput);
}

if (avatarInput) {
  avatarInput.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await uploadAvatar(String(reader.result || ''));
        updateAvatar(result);
      } catch {
        // Ignore upload UI failure beyond keeping current avatar.
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  });
}

if (avatarDeleteButton) {
  avatarDeleteButton.addEventListener('click', async () => {
    try {
      const result = await deleteAvatar();
      updateAvatar(result);
    } catch {
      // Ignore and keep current avatar.
    }
  });
}

fetchMe()
  .then((me) => {
    if (me) {
      updateVipState(me);
      updateAvatar(me);
      renderFavoriteCommands();
    }

    return loadCommandHistory(historyKeyword ? historyKeyword.value : '');
  })
  .catch(() => {
    window.location.href = '/login.html';
  });