import type { Localized } from "@/content/locales";
import type { CommandGroup, CommandId } from "../core/commands";
import type { BossKind } from "../entities/boss";
import type { Subweapon } from "../entities/hero";
import type { VibeLine } from "../entities/vibe";
import type { SlotSummary, StageId } from "../levels/campaign";
import type { ClosedReason } from "./ranking-client";

export interface GameTexts {
  description: string;
  opened: string;
  prompt: string;
  tip: string;
  controlsLabel: string;
  commands: Readonly<Record<CommandId, string>>;
  keys: { or: string; space: string };
  gestures: { midair: string; together: string };
  subweaponHints: Readonly<Record<Subweapon, string>>;
  panels: {
    close: string;
    ranking: {
      title: string;
      caption: string;
      position: string;
      name: string;
      time: string;
      loading: string;
      empty: string;
      off: string;
      error: string;
      retry: string;
      privacy: string;
    };
    commands: {
      title: string;
      groups: Readonly<Record<CommandGroup | "subweapons", string>>;
      footer: string;
    };
  };
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
    playTime: string;
  };
  record: {
    title: string;
    place: string;
    invite: string;
    initials: string;
    letter: string;
    help: string;
    privacy: string;
    save: string;
    saving: string;
    leave: string;
    confirm: string;
    keep: string;
    retry: string;
    problems: Readonly<Record<"incomplete" | "refused" | "failed", string>>;
    announce: string;
    places: readonly string[];
    lines: {
      checking: string;
      unknown: string;
      ineligible: string;
      saved: string;
      savedAnnounce: string;
      outside: string;
      tie: string;
      sent: string;
      closed: Readonly<Record<ClosedReason, string>>;
    };
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
    commands: {
      move: "andar",
      jump: "pular",
      cloud: "forma nuvem",
      crouch: "agachar",
      dropThrough: "descer da bandeja",
      whip: "chicote",
      subweapon: "subarma",
      switchSubweapon: "trocar subarma",
      pause: "pausa",
      mute: "som",
      confirm: "começar e pular a abertura",
      retry: "tentar de novo depois do Crash",
      ranking: "abrir e fechar o ranking",
      exit: "voltar ao SSMS",
    },
    keys: { or: "ou", space: "Espaço" },
    gestures: { midair: "Pulo no ar", together: "{key} + pulo" },
    subweaponHints: {
      select: "tiro em linha reta · {cost} de Query Energy",
      join: "vai e volta · {cost} de Query Energy",
      truncate: "limpa a tela · {cost} de Query Energy",
      drop: "sobe em arco e cai · {cost} de Query Energy",
    },
    panels: {
      close: "Fechar",
      ranking: {
        title: "Ranking",
        caption: "Os 10 melhores tempos",
        position: "#",
        name: "Nome",
        time: "Tempo",
        loading: "Carregando o ranking…",
        empty: "Ninguém no ranking ainda. Que tal ser o primeiro?",
        off: "O ranking está desligado agora. O jogo segue normal.",
        error: "Não consegui carregar o ranking agora.",
        retry: "Tentar de novo",
        privacy:
          "Só o nome e o tempo ficam aqui, visíveis para todo mundo. Nada mais é guardado.",
      },
      commands: {
        title: "Comandos",
        groups: {
          move: "Movimento",
          attack: "Ataque",
          game: "Partida",
          subweapons: "Subarmas",
        },
        footer: "As subarmas aparecem pelo caminho e gastam Query Energy.",
      },
    },
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
      playTime: "Tempo de jogo",
    },
    record: {
      title: "Novo recorde!",
      place: "{place} lugar · {time}",
      invite:
        "Uau, entrou no top 10! Digite suas iniciais, como nos fliperamas.",
      initials: "Suas iniciais",
      letter: "Letra {n} de {total}",
      help: "↑ ↓ trocam a letra · Backspace volta · Enter salva",
      privacy:
        "Seu nome e seu tempo ficam visíveis para todo mundo neste ranking. Não guardamos mais nada.",
      save: "Salvar",
      saving: "Salvando…",
      leave: "Sair sem salvar",
      confirm: "Sair sem salvar o recorde?",
      keep: "Continuar",
      retry: "Tentar de novo",
      problems: {
        incomplete: "Faltam letras: são três.",
        refused: "Essas letras não podem entrar. Que tal outras?",
        failed:
          "Não consegui salvar agora. O recorde continua aqui, é só tentar de novo.",
      },
      announce:
        "Novo recorde! {place} lugar com {time}. Digite suas iniciais e aperte Enter para salvar.",
      places: ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º", "10º"],
      lines: {
        checking: "Conferindo o ranking…",
        unknown:
          "Não consegui conferir o ranking agora. Dá para tentar de novo no painel do ranking.",
        ineligible:
          "Esta partida ficou fora do ranking, porque ele não respondeu quando ela começou.",
        saved: "Recorde salvo: {name} em {place} lugar.",
        savedAnnounce:
          "Recorde salvo! {name} está em {place} lugar no ranking.",
        outside: "Faltaram {missing} para o 10º lugar ({tenth}).",
        tie: "Empatou com o 10º lugar. No empate, fica na frente quem chegou primeiro.",
        sent: "Este resultado já tinha sido enviado ao ranking.",
        closed: {
          expired:
            "Esta partida passou do tempo limite do ranking e ficou de fora.",
          limit:
            "Muitos envios seguidos daqui. O ranking volta a aceitar daqui a pouco.",
          time: "Este tempo ficou fora dos limites do ranking.",
          off: "O ranking está desligado agora.",
          invalid: "Não deu para salvar este resultado no ranking.",
        },
      },
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
    commands: {
      move: "walk",
      jump: "jump",
      cloud: "cloud form",
      crouch: "crouch",
      dropThrough: "drop from a tray",
      whip: "whip",
      subweapon: "subweapon",
      switchSubweapon: "switch subweapon",
      pause: "pause",
      mute: "sound",
      confirm: "start and skip the opening",
      retry: "try again after a Crash",
      ranking: "open and close the ranking",
      exit: "back to SSMS",
    },
    keys: { or: "or", space: "Space" },
    gestures: { midair: "Jump in the air", together: "{key} + jump" },
    subweaponHints: {
      select: "straight shot · {cost} Query Energy",
      join: "flies out and comes back · {cost} Query Energy",
      truncate: "clears the screen · {cost} Query Energy",
      drop: "flies up in an arc and comes down · {cost} Query Energy",
    },
    panels: {
      close: "Close",
      ranking: {
        title: "Ranking",
        caption: "The 10 best times",
        position: "#",
        name: "Name",
        time: "Time",
        loading: "Loading the ranking…",
        empty: "Nobody on the ranking yet. Why not be the first?",
        off: "The ranking is off right now. The game works as usual.",
        error: "Couldn't load the ranking right now.",
        retry: "Try again",
        privacy:
          "Only the name and the time live here, visible to everyone. Nothing else is stored.",
      },
      commands: {
        title: "Commands",
        groups: {
          move: "Movement",
          attack: "Attack",
          game: "Game",
          subweapons: "Subweapons",
        },
        footer: "Subweapons turn up along the way and spend Query Energy.",
      },
    },
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
      playTime: "Play time",
    },
    record: {
      title: "New record!",
      place: "{place} place · {time}",
      invite:
        "Wow, you made the top 10! Type your initials, just like at the arcade.",
      initials: "Your initials",
      letter: "Letter {n} of {total}",
      help: "↑ ↓ change the letter · Backspace goes back · Enter saves",
      privacy:
        "Your name and time are visible to everyone on this ranking. Nothing else is stored.",
      save: "Save",
      saving: "Saving…",
      leave: "Leave without saving",
      confirm: "Leave without saving your record?",
      keep: "Keep going",
      retry: "Try again",
      problems: {
        incomplete: "Three letters, please.",
        refused: "Those letters can't be used. How about others?",
        failed:
          "Couldn't save right now. Your record is still here, just try again.",
      },
      announce:
        "New record! {place} place with {time}. Type your initials and press Enter to save.",
      places: [
        "1st",
        "2nd",
        "3rd",
        "4th",
        "5th",
        "6th",
        "7th",
        "8th",
        "9th",
        "10th",
      ],
      lines: {
        checking: "Checking the ranking…",
        unknown:
          "Couldn't check the ranking right now. You can try again in the ranking panel.",
        ineligible:
          "This run is not on the ranking, because the ranking didn't answer when it started.",
        saved: "Record saved: {name} in {place} place.",
        savedAnnounce:
          "Record saved! {name} is in {place} place on the ranking.",
        outside: "You were {missing} short of 10th place ({tenth}).",
        tie: "Tied with 10th place. On a tie, whoever got there first stays ahead.",
        sent: "This result had already been sent to the ranking.",
        closed: {
          expired:
            "This run went past the ranking's time limit and was left out.",
          limit:
            "Too many results sent from here in a row. The ranking will take new ones again soon.",
          time: "This time is outside the ranking's limits.",
          off: "The ranking is off right now.",
          invalid: "Couldn't save this result to the ranking.",
        },
      },
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
