import type { Localized } from "@/content/locales";
import type { BossKind } from "../entities/boss";
import type { Subweapon } from "../entities/hero";
import type { VibeLine } from "../entities/vibe";
import type { SlotSummary, StageId } from "../levels/campaign";

export interface GameTexts {
  description: string;
  opened: string;
  prompt: string;
  tip: string;
  controlsLabel: string;
  controls: readonly { keys: string; action: string }[];
  start: string;
  skip: string;
  resume: string;
  retry: string;
  exit: string;
  paused: string;
  hud: {
    player: string;
    ram: string;
    energy: string;
    cloud: string;
    cloudReady: string;
    cloudCharging: string;
    pause: string;
    exit: string;
    stage: string;
    heap: string;
    uptime: string;
    sound: string;
    soundOn: string;
    soundOff: string;
    firewall: string;
    index: string;
    cache: string;
    readme: string;
    seconds: string;
  };
  subweapons: Readonly<Record<Subweapon, string>>;
  bosses: Readonly<Record<BossKind, string>>;
  taglines: Readonly<Record<BossKind, string>>;
  stages: Readonly<Record<StageId, string>>;
  notices: {
    join: string;
    truncate: string;
    drop: string;
    firewall: string;
    index: string;
    cache: string;
    backup: string;
    readme: string;
    switch: string;
    arrival: string;
    vibe: string;
    collector: string;
    freed: string;
    unmasked: string;
    legacy: string;
    rollback: string;
    savepoint: string;
    soundOn: string;
    soundOff: string;
  };
  vibe: {
    lines: Readonly<Record<VibeLine, string>>;
  };
  crash: {
    header: string;
    message: string;
    advice: string;
    completionTime: string;
    status: string;
    announcement: string;
  };
  victory: {
    bosses: Readonly<Record<BossKind, string>>;
    rows: string;
    message: string;
    completionTime: string;
    status: string;
    announcement: string;
    credit: string;
  };
}

const SUBWEAPON_NAMES: Readonly<Record<Subweapon, string>> = {
  select: "SELECT",
  join: "JOIN",
  truncate: "TRUNCATE",
  drop: "DROP",
};

const BOSS_NAMES = {
  collector: "GARBAGE COLLECTOR",
  legacy: "THE LEGACY SYSTEM",
} as const;

export const GAME_TEXTS: Localized<GameTexts> = {
  "pt-BR": {
    description:
      "Um jogo de plataforma num castelo que também é um data center, com seis fases e três chefes. Você é o Admin: anda, pula, agacha e usa um cabo de rede como chicote, além de subarmas que gastam Query Energy. A RAM sobe quando você leva dano, e em 100% o jogo dá Crash. Tem música de órgão e efeitos sonoros; M liga e desliga o som.",
    opened:
      "Symphony of the Database aberto. Aperte Enter para começar. Esc volta ao SSMS quando você quiser.",
    prompt: "Aperte Enter para começar. Esc volta ao SSMS quando você quiser.",
    tip: "Dica: quebre os disquetes, eles guardam Query Energy.",
    controlsLabel: "Controles",
    controls: [
      { keys: "← → ou A D", action: "andar" },
      { keys: "↑ W ou Espaço", action: "pular" },
      { keys: "Pulo no ar", action: "forma nuvem" },
      { keys: "↓ ou S", action: "agachar" },
      { keys: "↓ + pulo", action: "descer da bandeja" },
      { keys: "Z", action: "chicote" },
      { keys: "X", action: "subarma" },
      { keys: "C", action: "trocar subarma" },
      { keys: "P", action: "pausa" },
      { keys: "Esc", action: "voltar ao SSMS" },
    ],
    start: "Começar",
    skip: "Enter pula a abertura",
    resume: "Continuar",
    retry: "Tentar de novo",
    exit: "Voltar ao SSMS",
    paused: "Pausado",
    hud: {
      player: "ADMIN",
      ram: "RAM",
      energy: "QUERY ENERGY",
      cloud: "NUVEM",
      cloudReady: "Forma nuvem pronta",
      cloudCharging: "Forma nuvem recarregando",
      pause: "Pausa",
      exit: "Voltar ao SSMS",
      stage: "FASE {current} DE {total}",
      heap: "HEAP",
      uptime: "UPTIME",
      sound: "Som",
      soundOn: "ligado",
      soundOff: "desligado",
      firewall: "FIREWALL",
      index: "ÍNDICE",
      cache: "CACHE",
      readme: "README",
      seconds: "{seconds} s",
    },
    subweapons: SUBWEAPON_NAMES,
    bosses: { vibe: "VIBE CODAS", ...BOSS_NAMES },
    taglines: {
      vibe: "100% confiante, 0% testado",
      collector: "Libera memória. Às vezes, a sua.",
      legacy: "Funciona. Ninguém sabe como.",
    },
    stages: {
      racks: "Hall dos Racks",
      catacombs: "Catacumbas do Backup",
      tapes: "Biblioteca de Fitas",
      lab: "Laboratório de Testes",
      stairs: "Escada da Produção",
      cron: "Torre do Cron",
    },
    notices: {
      join: "Você encontrou o JOIN: ele vai e volta. C troca de subarma.",
      truncate:
        "Você encontrou o TRUNCATE: limpa a tela, mas custa {cost} de Query Energy.",
      drop: "Você encontrou o DROP: ele sobe em arco e cai. Custa {cost} de Query Energy.",
      firewall: "Firewall ativo: o próximo golpe não passa.",
      index:
        "Índice criado: o chicote alcança mais longe por {seconds} segundos.",
      cache:
        "Cache aquecido: o chicote volta mais rápido por {seconds} segundos.",
      backup: "Backup restaurado: -{relief}% de RAM.",
      readme:
        "Você leu o README: o dano em RAM fica {percent}% menor até o fim.",
      switch: "Subarma ativa: {name}",
      arrival: "Fase {current} de {total}: {name}.",
      vibe: "O Vibe Codas jura que a demo está pronta para produção. Hora do code review.",
      collector:
        "O Garbage Collector veio liberar memória. Pule a foice e saia das faixas marcadas.",
      freed: "Memória liberada! Pegue o item GC e siga pela porta.",
      unmasked:
        "O Vibe Codas tirou a fantasia e deixou o README cair. Leia antes de seguir.",
      legacy:
        "The Legacy System roda há décadas e não aceita atualização. Hora do deploy.",
      rollback:
        "ROLLBACK! Ele desfez parte do dano. Hotfix aplicado: agora ele está mais rápido.",
      savepoint: "Savepoint criado. Se der crash, você volta daqui.",
      soundOn: "Som ligado.",
      soundOff: "Som desligado. M liga de novo.",
    },
    vibe: {
      lines: {
        intro: "Eu resolvo tudo com um prompt!",
        generate: "Gera tudo! Depois eu leio.",
        paste: "Ctrl+C, Ctrl+V. Pronto, escalou!",
        shield: "try { } catch { }. Erro? Que erro?",
        exposed: "Na minha máquina funciona!",
        deploy: "deploy --friday! O que pode dar errado?",
        defeat: "Tá, eu confesso: nunca li esse código.",
      },
    },
    crash: {
      header: "Msg 701, Nível 17, Estado 1, Linha 1",
      message:
        "Não há memória suficiente no pool de recursos 'default' para executar esta consulta.",
      advice:
        "A RAM do Admin chegou a 100%. Respire fundo e tente de novo, os dados contam com você.",
      completionTime: "Horário de conclusão",
      status: "Consulta concluída com erros.",
      announcement:
        "Crash: a RAM chegou a 100%. R tenta de novo e Esc volta ao SSMS.",
    },
    victory: {
      bosses: {
        vibe: "fantasia removida",
        collector: "memória liberada",
        legacy: "atualizado com COMMIT",
      },
      rows: "(3 linhas afetadas)",
      message:
        "Deploy concluído! O Legacy System finalmente aceitou a atualização, e os dados agradecem.",
      completionTime: "Horário de conclusão",
      status: "Consulta executada com êxito.",
      announcement:
        "Vitória! O Legacy System foi atualizado em {time}. Enter ou Esc voltam ao SSMS.",
      credit: "Um tributo carinhoso aos clássicos de ação em castelos góticos.",
    },
  },
  en: {
    description:
      "A platformer in a castle that is also a data center, with six stages and three bosses. You are the Admin: walk, jump, crouch and use a network cable as a whip, plus subweapons that spend Query Energy. RAM goes up when you take damage, and at 100% the game crashes. There is organ music and sound effects; M turns the sound on and off.",
    opened:
      "Symphony of the Database is open. Press Enter to start. Esc takes you back to SSMS whenever you like.",
    prompt:
      "Press Enter to start. Esc takes you back to SSMS whenever you like.",
    tip: "Tip: break the floppy disks, they hold Query Energy.",
    controlsLabel: "Controls",
    controls: [
      { keys: "← → or A D", action: "walk" },
      { keys: "↑ W or Space", action: "jump" },
      { keys: "Jump in the air", action: "cloud form" },
      { keys: "↓ or S", action: "crouch" },
      { keys: "↓ + jump", action: "drop from a tray" },
      { keys: "Z", action: "whip" },
      { keys: "X", action: "subweapon" },
      { keys: "C", action: "switch subweapon" },
      { keys: "P", action: "pause" },
      { keys: "Esc", action: "back to SSMS" },
    ],
    start: "Start",
    skip: "Enter skips the opening",
    resume: "Resume",
    retry: "Try again",
    exit: "Back to SSMS",
    paused: "Paused",
    hud: {
      player: "ADMIN",
      ram: "RAM",
      energy: "QUERY ENERGY",
      cloud: "CLOUD",
      cloudReady: "Cloud form ready",
      cloudCharging: "Cloud form recharging",
      pause: "Pause",
      exit: "Back to SSMS",
      stage: "STAGE {current} OF {total}",
      heap: "HEAP",
      uptime: "UPTIME",
      sound: "Sound",
      soundOn: "on",
      soundOff: "off",
      firewall: "FIREWALL",
      index: "INDEX",
      cache: "CACHE",
      readme: "README",
      seconds: "{seconds} s",
    },
    subweapons: SUBWEAPON_NAMES,
    bosses: { vibe: "VIBE CODER", ...BOSS_NAMES },
    taglines: {
      vibe: "100% confident, 0% tested",
      collector: "Frees memory. Sometimes yours.",
      legacy: "It works. Nobody knows how.",
    },
    stages: {
      racks: "Hall of Racks",
      catacombs: "Backup Catacombs",
      tapes: "Tape Library",
      lab: "Test Lab",
      stairs: "Production Stairs",
      cron: "Cron Tower",
    },
    notices: {
      join: "You found JOIN: it flies out and comes back. C switches subweapons.",
      truncate:
        "You found TRUNCATE: it clears the screen, but costs {cost} Query Energy.",
      drop: "You found DROP: it flies up in an arc and comes down. It costs {cost} Query Energy.",
      firewall: "Firewall up: the next hit won't get through.",
      index: "Index built: your whip reaches further for {seconds} seconds.",
      cache: "Warm cache: your whip comes back faster for {seconds} seconds.",
      backup: "Backup restored: -{relief}% RAM.",
      readme:
        "You read the README: RAM damage is {percent}% lower until the end.",
      switch: "Active subweapon: {name}",
      arrival: "Stage {current} of {total}: {name}.",
      vibe: "The Vibe Coder swears the demo is production ready. Time for a code review.",
      collector:
        "The Garbage Collector came to free some memory. Jump over the scythe and stay out of the marked lanes.",
      freed: "Memory freed! Grab the GC item and head through the door.",
      unmasked:
        "The Vibe Coder dropped the costume, and the README with it. Read it before you go.",
      legacy:
        "The Legacy System has been running for decades and refuses to update. Time to deploy.",
      rollback:
        "ROLLBACK! It undid part of the damage. Hotfix applied: now it is faster.",
      savepoint: "Savepoint created. If you crash, you'll come back here.",
      soundOn: "Sound on.",
      soundOff: "Sound off. M turns it back on.",
    },
    vibe: {
      lines: {
        intro: "I fix everything with one prompt!",
        generate: "Generate it all! I'll read it later.",
        paste: "Ctrl+C, Ctrl+V. Done, it scales!",
        shield: "try { } catch { }. Error? What error?",
        exposed: "It works on my machine!",
        deploy: "deploy --friday! What could go wrong?",
        defeat: "Okay, I confess: I never read this code.",
      },
    },
    crash: {
      header: "Msg 701, Level 17, State 1, Line 1",
      message:
        "There is insufficient system memory in resource pool 'default' to run this query.",
      advice:
        "The Admin's RAM hit 100%. Take a deep breath and try again, the data is counting on you.",
      completionTime: "Completion time",
      status: "Query completed with errors.",
      announcement:
        "Crash: RAM hit 100%. R tries again and Esc takes you back to SSMS.",
    },
    victory: {
      bosses: {
        vibe: "costume removed",
        collector: "memory freed",
        legacy: "updated with COMMIT",
      },
      rows: "(3 rows affected)",
      message:
        "Deploy complete! The Legacy System finally accepted the update, and the data says thanks.",
      completionTime: "Completion time",
      status: "Query executed successfully.",
      announcement:
        "Victory! The Legacy System was updated in {time}. Enter or Esc takes you back to SSMS.",
      credit: "A loving tribute to the classic gothic castle action games.",
    },
  },
};

export function fill(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

export function slotTitle(slot: SlotSummary, text: GameTexts): string {
  if (slot.kind === "boss") {
    return text.bosses[slot.boss];
  }
  return fill(text.hud.stage, { current: slot.number, total: slot.total });
}

export function arrivalText(slot: SlotSummary, text: GameTexts): string {
  if (slot.kind === "boss") {
    return text.bosses[slot.boss];
  }
  return fill(text.notices.arrival, {
    current: slot.number,
    total: slot.total,
    name: text.stages[slot.stage],
  });
}
